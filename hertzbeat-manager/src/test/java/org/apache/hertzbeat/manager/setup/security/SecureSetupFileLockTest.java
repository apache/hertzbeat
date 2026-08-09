/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.locks.LockSupport;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class SecureSetupFileLockTest {

    private static final String LOCK_PATH = "data/config/.cooperative-test.lock";

    @TempDir
    private Path root;

    @Test
    void canonicalAliasesShareTheSameJvmLock() throws Exception {
        Path alias = root.resolve("alias");
        Files.createSymbolicLink(alias, root);
        SecureSetupFileLock lexical = new SecureSetupFileLock(root, LOCK_PATH);
        SecureSetupFileLock canonical = new SecureSetupFileLock(alias, LOCK_PATH);
        assertSerialized(lexical, canonical, null);
    }

    @Test
    void replacementInodeCannotSplitCooperatingJvmContexts() throws Exception {
        Path alias = root.resolve("replacement-alias");
        Files.createSymbolicLink(alias, root);
        SecureSetupFileLock lexical = new SecureSetupFileLock(root, LOCK_PATH);
        SecureSetupFileLock canonical = new SecureSetupFileLock(alias, LOCK_PATH);
        Path lockFile = root.resolve(LOCK_PATH);
        assertSerialized(lexical, canonical, () -> {
            Files.delete(lockFile);
            SecureSetupFile.create(root, lockFile, "replacement\n".getBytes(StandardCharsets.UTF_8));
        });
    }

    @Test
    void createsMissingTrustedRootWithoutWeakeningFileBoundary() throws Exception {
        Path missingRoot = root.resolve("missing-installation-root");

        new SecureSetupFileLock(missingRoot, LOCK_PATH).execute(() -> { });

        assertThat(missingRoot).isDirectory();
        assertThat(SecureSetupFile.isOwnerOnlyRegularFile(missingRoot.resolve(LOCK_PATH))).isTrue();
    }

    @Test
    void childProcessLockIsSerialized() throws Exception {
        Path ready = root.resolve("child-ready");
        Path entered = root.resolve("child-entered");
        Path release = root.resolve("child-release");
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString();
        ProcessBuilder command = new ProcessBuilder(java, "-cp", System.getProperty("java.class.path"),
                SecureSetupFileLockProcessMain.class.getName(), root.toString(), ready.toString(),
                entered.toString(), release.toString())
                .redirectErrorStream(true);
        Process[] child = new Process[1];
        try {
            SecureSetupFileLock parent = new SecureSetupFileLock(root, LOCK_PATH);
            parent.execute(() -> {
                child[0] = command.start();
                assertThat(awaitFileContent(ready, child[0])).isEqualTo("blocked-by-os-lock");
                if (Files.exists(entered)) {
                    throw new IOException("Child entered the parent lock critical section");
                }
            });
            awaitFile(entered);
            Files.createFile(release);
            assertThat(child[0].waitFor(5, TimeUnit.SECONDS)).isTrue();
            assertThat(child[0].exitValue()).isZero();
        } finally {
            if (child[0] != null) {
                child[0].destroyForcibly();
            }
        }
    }

    private void assertSerialized(
            SecureSetupFileLock first, SecureSetupFileLock second, CheckedAction whileLocked) throws Exception {
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<Boolean> owner = executor.submit(() -> first.execute(() -> {
                entered.countDown();
                awaitLatch(release);
                return true;
            }));
            assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
            if (whileLocked != null) {
                whileLocked.run();
            }
            Future<Boolean> waiter = executor.submit(() -> second.execute(() -> true));
            assertBlocked(waiter);
            release.countDown();
            if (whileLocked == null) {
                assertThat(owner.get(5, TimeUnit.SECONDS)).isTrue();
                assertThat(waiter.get(5, TimeUnit.SECONDS)).isTrue();
            } else {
                assertThatThrownBy(() -> owner.get(5, TimeUnit.SECONDS))
                        .hasRootCauseInstanceOf(IOException.class);
                assertThatThrownBy(() -> waiter.get(5, TimeUnit.SECONDS))
                        .hasRootCauseInstanceOf(IOException.class);
            }
        }
    }

    private void assertBlocked(Future<Boolean> acquisition) {
        try {
            acquisition.get(200, TimeUnit.MILLISECONDS);
            throw new AssertionError("Lock acquisition completed inside another critical section");
        } catch (TimeoutException expected) {
            // Expected proof that another context still owns the critical section.
        } catch (ExecutionException failure) {
            throw new AssertionError("Lock acquisition failed instead of waiting", failure.getCause());
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new AssertionError("Interrupted while proving lock serialization", interrupted);
        }
    }

    private void awaitFile(Path file) throws IOException {
        Instant deadline = Instant.now().plus(Duration.ofSeconds(5));
        while (!Files.exists(file) && Instant.now().isBefore(deadline)) {
            LockSupport.parkNanos(Duration.ofMillis(10).toNanos());
        }
        if (!Files.exists(file)) {
            throw new IOException("Timed out waiting for child lock fixture");
        }
    }

    private String awaitFileContent(Path file, Process child) throws IOException {
        Instant deadline = Instant.now().plus(Duration.ofSeconds(5));
        while (Instant.now().isBefore(deadline)) {
            if (Files.exists(file) && Files.size(file) > 0) {
                return Files.readString(file);
            }
            Thread.onSpinWait();
        }
        if (!child.isAlive()) {
            throw new IOException("Child lock probe exited: "
                    + new String(child.getInputStream().readAllBytes(), StandardCharsets.UTF_8));
        }
        throw new IOException("Timed out waiting for child lock evidence");
    }

    private void awaitLatch(CountDownLatch latch) throws IOException {
        try {
            if (!latch.await(5, TimeUnit.SECONDS)) {
                throw new IOException("Timed out waiting for lock test release");
            }
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IOException("Interrupted while waiting for lock test release", interrupted);
        }
    }

    @FunctionalInterface
    private interface CheckedAction {
        void run() throws Exception;
    }
}
