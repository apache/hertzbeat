/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.startup.runtime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;
import org.apache.hertzbeat.manager.maintenance.DeploymentSingletonLease;
import org.apache.hertzbeat.manager.maintenance.StandaloneDeploymentSingletonAuthority;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class StandaloneDeploymentOwnerTest {

    @TempDir
    private Path temporaryDirectory;

    @Test
    void sameCanonicalRootHasOneOwnerWhileDifferentRootsAreDifferentDeployments() throws Exception {
        Path firstRoot = temporaryDirectory.resolve("first");
        Path alias = temporaryDirectory.resolve("alias");
        ResolvedStartupInstallationRoot first = resolve(firstRoot);
        Files.createSymbolicLink(alias, first.canonicalRoot());
        StandaloneDeploymentOwner owner = StandaloneDeploymentOwner.acquire(first);

        assertThatThrownBy(() -> StandaloneDeploymentOwner.acquire(resolve(alias)))
                .isInstanceOf(StandaloneDeploymentOwnerException.class);
        try (StandaloneDeploymentOwner different = StandaloneDeploymentOwner.acquire(
                resolve(temporaryDirectory.resolve("different")))) {
            assertThat(different.isValid()).isTrue();
        }
        owner.close();
        try (StandaloneDeploymentOwner reacquired = StandaloneDeploymentOwner.acquire(resolve(firstRoot))) {
            assertThat(reacquired.isValid()).isTrue();
        }
        assertThat(Files.exists(firstRoot.resolve(StandaloneDeploymentOwner.LOCK_PATH))).isTrue();
    }

    @Test
    void lockOrRootIdentityReplacementInvalidatesViewWithoutReacquiring() throws Exception {
        Path root = temporaryDirectory.resolve("replace");
        StandaloneDeploymentOwner owner = StandaloneDeploymentOwner.acquire(resolve(root));
        Path lock = root.resolve(StandaloneDeploymentOwner.LOCK_PATH);
        Files.move(lock, lock.resolveSibling("owner.old"));
        Files.createFile(lock);

        assertThat(owner.view().isValid()).isFalse();
        owner.close();

        Path rootReplacement = temporaryDirectory.resolve("root-replacement");
        StandaloneDeploymentOwner replacedRootOwner = StandaloneDeploymentOwner.acquire(resolve(rootReplacement));
        Files.move(rootReplacement, temporaryDirectory.resolve("moved-root"));
        Files.createDirectories(rootReplacement);
        assertThat(replacedRootOwner.view().isValid()).isFalse();
        replacedRootOwner.close();
    }

    @Test
    void childJvmContentionCloseAndCrashReleaseAreDeterministic() throws Exception {
        Path root = temporaryDirectory.resolve("process");
        ChildOwner first = startChild(root);
        assertThat(first.readStatus()).isEqualTo("LOCKED");
        ChildOwner blocked = startChild(root);
        assertThat(blocked.readStatus()).isEqualTo("FAILED");
        assertThat(blocked.process.waitFor(5, TimeUnit.SECONDS)).isTrue();
        assertThat(blocked.process.exitValue()).isEqualTo(23);

        first.release();
        ChildOwner afterClose = startChild(root);
        assertThat(afterClose.readStatus()).isEqualTo("LOCKED");
        afterClose.process.destroyForcibly();
        assertThat(afterClose.process.waitFor(5, TimeUnit.SECONDS)).isTrue();

        ChildOwner afterCrash = startChild(root);
        assertThat(afterCrash.readStatus()).isEqualTo("LOCKED");
        afterCrash.release();
    }

    @Test
    void migrationLeaseCloseDoesNotReleaseProcessOwner() throws Exception {
        Path root = temporaryDirectory.resolve("lease");
        try (StandaloneDeploymentOwner owner = StandaloneDeploymentOwner.acquire(resolve(root))) {
            StandaloneDeploymentSingletonAuthority authority =
                    new StandaloneDeploymentSingletonAuthority(owner.view(), () -> true);
            DeploymentSingletonLease lease = authority.acquire("operation", java.time.Duration.ZERO);
            lease.close();

            ChildOwner blocked = startChild(root);
            assertThat(blocked.readStatus()).isEqualTo("FAILED");
            assertThat(blocked.process.waitFor(5, TimeUnit.SECONDS)).isTrue();
            assertThat(blocked.process.exitValue()).isEqualTo(23);
        }
        ChildOwner released = startChild(root);
        assertThat(released.readStatus()).isEqualTo("LOCKED");
        released.release();
    }

    private ResolvedStartupInstallationRoot resolve(Path root) {
        return new StartupInstallationRootResolver().resolve(
                new String[] {"--hertzbeat.internal.installation-root=" + root});
    }

    private ChildOwner startChild(Path root) throws Exception {
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString();
        Process process = new ProcessBuilder(java, "-cp", System.getProperty("java.class.path"),
                StandaloneDeploymentOwnerProcessMain.class.getName(), root.toString())
                .redirectErrorStream(true)
                .start();
        return new ChildOwner(process, new BufferedReader(new InputStreamReader(process.getInputStream())));
    }

    private record ChildOwner(Process process, BufferedReader output) {

        String readStatus() throws Exception {
            return output.readLine();
        }

        void release() throws Exception {
            process.getOutputStream().write('\n');
            process.getOutputStream().flush();
            assertThat(process.waitFor(5, TimeUnit.SECONDS)).isTrue();
            assertThat(process.exitValue()).isZero();
        }
    }
}
