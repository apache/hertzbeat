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

package org.apache.hertzbeat.common.entity.job;

import java.time.Clock;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.BooleanSupplier;

/**
 * In-process, single-use authorization for one exact inline collection invocation. Never
 * serialized.
 */
public final class InlineCollectionPermit {
    private static final java.lang.ref.ReferenceQueue<Metrics> COLLECTED =
            new java.lang.ref.ReferenceQueue<>();
    private static final java.util.Map<IdentityReference, InlineCollectionPermit> LOCAL =
            new java.util.HashMap<>();

    /** Internal capability association uses identity, not mutable Metrics.equals/hashCode. */
    public static synchronized void bind(Metrics metric, InlineCollectionPermit permit) {
        Objects.requireNonNull(metric);
        Objects.requireNonNull(permit);
        cleanup();
        var key = new IdentityReference(metric, COLLECTED);
        var previous = LOCAL.get(key);
        if (previous != null && previous != permit)
            throw new IllegalStateException("Collection capability cannot be replaced");
        if (previous == null && LOCAL.size() >= 512)
            throw new IllegalStateException("Local collection capability capacity reached");
        LOCAL.put(key, permit);
    }

    public static synchronized InlineCollectionPermit find(Metrics metric) {
        try {
            cleanup();
            return metric == null ? null : LOCAL.get(new IdentityReference(metric, null));
        } finally {
            java.lang.ref.Reference.reachabilityFence(metric);
        }
    }

    private static void cleanup() {
        java.lang.ref.Reference<? extends Metrics> ref;
        while ((ref = COLLECTED.poll()) != null) LOCAL.remove(ref);
    }

    private static final class IdentityReference extends java.lang.ref.WeakReference<Metrics> {
        private final int hash;

        IdentityReference(Metrics metric, java.lang.ref.ReferenceQueue<Metrics> queue) {
            super(metric, queue);
            hash = System.identityHashCode(metric);
        }

        @Override
        public int hashCode() {
            return hash;
        }

        @Override
        public boolean equals(Object other) {
            return this == other
                    || get() != null
                            && other instanceof IdentityReference ref
                            && get() == ref.get();
        }
    }

    private final List<String> command;
    private final String directory;
    private final String account;
    private final String operatingSystem;
    private final long expiresAt;
    private final Clock clock;
    private final BooleanSupplier current;
    private final AtomicBoolean consumed = new AtomicBoolean();
    private final AtomicBoolean started = new AtomicBoolean();

    public InlineCollectionPermit(
            List<String> command,
            String directory,
            String account,
            String operatingSystem,
            long expiresAt,
            Clock clock,
            BooleanSupplier current) {
        this.command = List.copyOf(command);
        this.directory = Objects.requireNonNull(directory);
        this.account = Objects.requireNonNull(account);
        this.operatingSystem = Objects.requireNonNull(operatingSystem);
        this.expiresAt = expiresAt;
        this.clock = Objects.requireNonNull(clock);
        this.current = Objects.requireNonNull(current);
    }

    /** Called at the final Collector process boundary, using the actual ProcessBuilder values. */
    public void consume(List<String> actualCommand, String actualDirectory) {
        if (clock.millis() >= expiresAt
                || !command.equals(actualCommand)
                || !directory.equals(actualDirectory)
                || !account.equals(processAccount())
                || !operatingSystem.equals(System.getProperty("os.name"))
                || !current.getAsBoolean()
                || clock.millis() >= expiresAt
                || !consumed.compareAndSet(false, true)) {
            throw new IllegalStateException(
                    "Approved collection context changed, expired or was consumed");
        }
    }

    public boolean consumed() {
        return consumed.get();
    }

    /** Only called after the Collector process factory returned an actual process. */
    public void markStarted() {
        if (!consumed.get() || !started.compareAndSet(false, true))
            throw new IllegalStateException("Collection start was not reserved");
    }

    public boolean started() {
        return started.get();
    }

    /** Actual process owner rather than the overrideable user.name JVM property. */
    public static String processAccount() {
        return ProcessHandle.current()
                .info()
                .user()
                .orElseThrow(
                        () ->
                                new IllegalStateException(
                                        "Collector process account is unavailable"));
    }
}
