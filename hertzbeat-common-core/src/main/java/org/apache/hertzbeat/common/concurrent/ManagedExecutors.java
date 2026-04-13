/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.common.concurrent;

import java.util.ArrayDeque;
import java.util.Objects;
import java.util.concurrent.BlockingDeque;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.LinkedBlockingDeque;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.Semaphore;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Factory methods for managed executors.
 */
public final class ManagedExecutors {

    private ManagedExecutors() {
    }

    /**
     * Wrap an existing executor service.
     *
     * @param name executor name
     * @param executorService delegate executor service
     * @return managed executor wrapper
     */
    public static ManagedExecutor wrap(String name, ExecutorService executorService) {
        return new DefaultManagedExecutor(name, executorService, null, AdmissionMode.UNBOUNDED_VT);
    }

    /**
     * Create a per-task virtual-thread executor with optional admission control.
     *
     * @param name executor name
     * @param threadNamePrefix thread name prefix
     * @param mode admission mode
     * @param maxConcurrentTasks max concurrent tasks for limited modes
     * @param handler uncaught exception handler
     * @return managed executor
     */
    public static ManagedExecutor newVirtualExecutor(String name, String threadNamePrefix, AdmissionMode mode,
                                                     int maxConcurrentTasks, Thread.UncaughtExceptionHandler handler) {
        ThreadFactory threadFactory = Thread.ofVirtual()
                .name(threadNamePrefix, 0)
                .uncaughtExceptionHandler(handler)
                .factory();
        ExecutorService executorService = Executors.newThreadPerTaskExecutor(threadFactory);
        return new DefaultManagedExecutor(name, executorService, semaphore(mode, maxConcurrentTasks), mode);
    }

    /**
     * Create a platform-thread-per-task executor for a small number of long-running tasks.
     *
     * @param name executor name
     * @param threadNamePrefix thread name prefix
     * @param handler uncaught exception handler
     * @return managed executor
     */
    public static ManagedExecutor newPlatformExecutor(String name, String threadNamePrefix,
                                                      Thread.UncaughtExceptionHandler handler) {
        ThreadFactory threadFactory = Thread.ofPlatform()
                .daemon(true)
                .name(threadNamePrefix, 0)
                .uncaughtExceptionHandler(handler)
                .factory();
        ExecutorService executorService = Executors.newThreadPerTaskExecutor(threadFactory);
        return new DefaultManagedExecutor(name, executorService, null, AdmissionMode.UNBOUNDED_VT);
    }

    /**
     * Create a queued executor that preserves queue semantics while executing tasks on virtual threads.
     *
     * @param name executor name
     * @param threadNamePrefix virtual-thread name prefix
     * @param maxConcurrentTasks max concurrent tasks
     * @param queueCapacity queue capacity, {@code <= 0} means unbounded
     * @param handler uncaught exception handler
     * @return managed executor
     */
    public static ManagedExecutor newQueuedVirtualExecutor(String name, String threadNamePrefix, int maxConcurrentTasks,
                                                           int queueCapacity, Thread.UncaughtExceptionHandler handler) {
        if (maxConcurrentTasks <= 0) {
            throw new IllegalArgumentException("maxConcurrentTasks must be greater than zero for queued executors");
        }
        return new QueuedVirtualManagedExecutor(name, threadNamePrefix, maxConcurrentTasks, queueCapacity, handler);
    }

    /**
     * Create a virtual-thread executor that preserves {@link java.util.concurrent.ThreadPoolExecutor}
     * core/max/queue semantics with discard-oldest overflow handling.
     *
     * @param name executor name
     * @param threadNamePrefix virtual-thread name prefix
     * @param coreConcurrentTasks core concurrent tasks
     * @param maxConcurrentTasks max concurrent tasks
     * @param queueCapacity queue capacity
     * @param handler uncaught exception handler
     * @return managed executor
     */
    public static ManagedExecutor newDiscardOldestVirtualExecutor(String name, String threadNamePrefix,
                                                                  int coreConcurrentTasks, int maxConcurrentTasks,
                                                                  int queueCapacity,
                                                                  Thread.UncaughtExceptionHandler handler) {
        if (coreConcurrentTasks <= 0) {
            throw new IllegalArgumentException("coreConcurrentTasks must be greater than zero");
        }
        if (maxConcurrentTasks < coreConcurrentTasks) {
            throw new IllegalArgumentException("maxConcurrentTasks must be greater than or equal to coreConcurrentTasks");
        }
        if (queueCapacity <= 0) {
            throw new IllegalArgumentException("queueCapacity must be greater than zero");
        }
        return new DiscardOldestVirtualManagedExecutor(name, threadNamePrefix, coreConcurrentTasks,
                maxConcurrentTasks, queueCapacity, handler);
    }

    private static Semaphore semaphore(AdmissionMode mode, int maxConcurrentTasks) {
        if (mode == AdmissionMode.UNBOUNDED_VT) {
            return null;
        }
        if (maxConcurrentTasks <= 0) {
            throw new IllegalArgumentException("maxConcurrentTasks must be greater than zero for limited executors");
        }
        return new Semaphore(maxConcurrentTasks);
    }

    private static final class DefaultManagedExecutor implements ManagedExecutor {

        private final String name;
        private final ExecutorService delegate;
        private final Semaphore permits;
        private final AdmissionMode admissionMode;

        private DefaultManagedExecutor(String name, ExecutorService delegate, Semaphore permits,
                                       AdmissionMode admissionMode) {
            this.name = Objects.requireNonNull(name, "name");
            this.delegate = Objects.requireNonNull(delegate, "delegate");
            this.permits = permits;
            this.admissionMode = Objects.requireNonNull(admissionMode, "admissionMode");
        }

        @Override
        public String name() {
            return name;
        }

        @Override
        public void execute(Runnable command) {
            Objects.requireNonNull(command, "command");
            acquirePermit();
            boolean submitted = false;
            try {
                delegate.execute(() -> {
                    try {
                        command.run();
                    } finally {
                        releasePermit();
                    }
                });
                submitted = true;
            } finally {
                if (!submitted) {
                    releasePermit();
                }
            }
        }

        @Override
        public void close() {
            delegate.shutdownNow();
        }

        private void acquirePermit() {
            if (permits == null) {
                return;
            }
            switch (admissionMode) {
                case LIMIT_AND_REJECT:
                    if (!permits.tryAcquire()) {
                        throw new RejectedExecutionException(name + " rejected task because concurrency limit was reached");
                    }
                    break;
                case LIMIT_AND_BLOCK:
                    try {
                        permits.acquire();
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        throw new RejectedExecutionException(name + " interrupted while waiting for an execution permit", e);
                    }
                    break;
                case UNBOUNDED_VT:
                    break;
                default:
                    throw new IllegalStateException("Unsupported admission mode: " + admissionMode);
            }
        }

        private void releasePermit() {
            if (permits != null) {
                permits.release();
            }
        }
    }

    private static final class QueuedVirtualManagedExecutor implements ManagedExecutor {

        private final String name;
        private final ExecutorService delegate;
        private final ExecutorService dispatcher;
        private final BlockingDeque<Runnable> queue;
        private final Semaphore permits;
        private final Semaphore permitSignals;
        private final AtomicBoolean closed;

        private QueuedVirtualManagedExecutor(String name, String threadNamePrefix, int maxConcurrentTasks,
                                             int queueCapacity, Thread.UncaughtExceptionHandler handler) {
            this.name = Objects.requireNonNull(name, "name");
            ThreadFactory virtualFactory = Thread.ofVirtual()
                    .name(threadNamePrefix, 0)
                    .uncaughtExceptionHandler(handler)
                    .factory();
            this.delegate = Executors.newThreadPerTaskExecutor(virtualFactory);
            this.queue = queueCapacity > 0 ? new LinkedBlockingDeque<>(queueCapacity) : new LinkedBlockingDeque<>();
            this.permits = new Semaphore(maxConcurrentTasks);
            this.permitSignals = new Semaphore(0);
            this.closed = new AtomicBoolean(false);
            ThreadFactory dispatcherFactory = Thread.ofPlatform()
                    .daemon(true)
                    .name(threadNamePrefix + "dispatcher-", 0)
                    .uncaughtExceptionHandler(handler)
                    .factory();
            this.dispatcher = Executors.newSingleThreadExecutor(dispatcherFactory);
            this.dispatcher.execute(this::dispatchLoop);
        }

        @Override
        public String name() {
            return name;
        }

        @Override
        public void execute(Runnable command) {
            Objects.requireNonNull(command, "command");
            if (closed.get()) {
                throw new RejectedExecutionException(name + " rejected task because executor is closed");
            }
            if (!queue.offerLast(command)) {
                throw new RejectedExecutionException(name + " rejected task because queue capacity was reached");
            }
        }

        @Override
        public void close() {
            if (!closed.compareAndSet(false, true)) {
                return;
            }
            dispatcher.shutdownNow();
            delegate.shutdownNow();
            queue.clear();
        }

        private void dispatchLoop() {
            try {
                while (!Thread.currentThread().isInterrupted()) {
                    Runnable command = queue.takeFirst();
                    if (!permits.tryAcquire()) {
                        queue.putFirst(command);
                        permitSignals.acquire();
                        continue;
                    }
                    submit(command);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }

        private void submit(Runnable command) {
            boolean submitted = false;
            try {
                delegate.execute(() -> {
                    try {
                        command.run();
                    } finally {
                        permits.release();
                        permitSignals.release();
                    }
                });
                submitted = true;
            } finally {
                if (!submitted) {
                    permits.release();
                    permitSignals.release();
                }
            }
        }
    }

    private static final class DiscardOldestVirtualManagedExecutor implements ManagedExecutor {

        private final String name;
        private final ExecutorService delegate;
        private final int coreConcurrentTasks;
        private final int maxConcurrentTasks;
        private final ArrayDeque<Runnable> queue;
        private final int queueCapacity;
        private final Object lock;
        private boolean closed;
        private int runningTasks;

        private DiscardOldestVirtualManagedExecutor(String name, String threadNamePrefix, int coreConcurrentTasks,
                                                    int maxConcurrentTasks, int queueCapacity,
                                                    Thread.UncaughtExceptionHandler handler) {
            this.name = Objects.requireNonNull(name, "name");
            ThreadFactory virtualFactory = Thread.ofVirtual()
                    .name(threadNamePrefix, 0)
                    .uncaughtExceptionHandler(handler)
                    .factory();
            this.delegate = Executors.newThreadPerTaskExecutor(virtualFactory);
            this.coreConcurrentTasks = coreConcurrentTasks;
            this.maxConcurrentTasks = maxConcurrentTasks;
            this.queueCapacity = queueCapacity;
            this.queue = new ArrayDeque<>(queueCapacity);
            this.lock = new Object();
            this.closed = false;
            this.runningTasks = 0;
        }

        @Override
        public String name() {
            return name;
        }

        @Override
        public void execute(Runnable command) {
            Objects.requireNonNull(command, "command");
            Runnable taskToStart = null;
            synchronized (lock) {
                if (closed) {
                    throw new RejectedExecutionException(name + " rejected task because executor is closed");
                }
                if (runningTasks < coreConcurrentTasks) {
                    runningTasks++;
                    taskToStart = command;
                } else if (queue.size() < queueCapacity) {
                    queue.offerLast(command);
                    return;
                } else if (runningTasks < maxConcurrentTasks) {
                    runningTasks++;
                    taskToStart = command;
                } else {
                    queue.pollFirst();
                    queue.offerLast(command);
                    return;
                }
            }
            submit(taskToStart);
        }

        @Override
        public void close() {
            synchronized (lock) {
                if (closed) {
                    return;
                }
                closed = true;
                queue.clear();
            }
            delegate.shutdownNow();
        }

        private void submit(Runnable command) {
            boolean submitted = false;
            try {
                delegate.execute(() -> {
                    try {
                        command.run();
                    } finally {
                        onTaskComplete();
                    }
                });
                submitted = true;
            } finally {
                if (!submitted) {
                    synchronized (lock) {
                        runningTasks--;
                    }
                    throw new RejectedExecutionException(name + " rejected task because delegate submission failed");
                }
            }
        }

        private void onTaskComplete() {
            Runnable nextTask = null;
            synchronized (lock) {
                if (closed) {
                    runningTasks--;
                    return;
                }
                nextTask = queue.pollFirst();
                if (nextTask == null) {
                    runningTasks--;
                    return;
                }
            }
            submit(nextTask);
        }
    }
}
