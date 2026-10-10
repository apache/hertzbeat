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

package org.apache.hertzbeat.manager.setup.workflow;

import java.nio.file.Path;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.util.Objects;
import java.util.concurrent.Executor;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction;
import org.apache.hertzbeat.manager.setup.installation.LocalInstallationFingerprintStore;

/** Owns the JDBC verifier and managed reconciler dependencies across gated startup retries. */
final class DefaultManagedMigrationStartupRecoveryRuntime
        implements ManagedMigrationStartupRecoveryRuntime {

    private final FileMigrationOperationStore store;
    private final ManagedMigrationConfigurationTransaction configuration;
    private final CandidateBackedMigrationStartupTargetVerifier verifier;
    private final Clock clock;

    DefaultManagedMigrationStartupRecoveryRuntime(
            Path root,
            FileMigrationOperationStore store,
            Duration timeout,
            Executor abortExecutor) {
        this.store = Objects.requireNonNull(store, "store");
        configuration = new ManagedMigrationConfigurationTransaction(root);
        TargetJdbcConnectionFactory factory = new TargetJdbcConnectionFactory(abortExecutor);
        LocalInstallationFingerprintStore fingerprints = new LocalInstallationFingerprintStore(
                root, root.resolve("data/config/.installation-fingerprint"), new SecureRandom());
        verifier = new CandidateBackedMigrationStartupTargetVerifier(
                configuration, fingerprints, factory, new MigrationStartupTargetInspector(),
                timeout, System::nanoTime);
        clock = Clock.systemUTC();
    }

    @Override
    public MigrationStartupReconciliation reconcile(DurableCutoverDraft draft) {
        return new ManagedMigrationStartupReconciler(
                draft, store, configuration, verifier, clock).reconcile();
    }

    @Override
    public void close() {
        verifier.close();
    }
}
