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

package org.apache.hertzbeat.startup.runtime;

import java.nio.file.Path;
import java.time.Duration;
import java.util.concurrent.Executor;
import org.apache.hertzbeat.manager.maintenance.StandaloneDeploymentOwnerView;
import org.apache.hertzbeat.manager.setup.workflow.ManagedMigrationStartupRecoverySession;

/** Creates one migration recovery session after the standalone owner is established. */
@FunctionalInterface
interface StartupMigrationRecoveryPreflightFactory {

    StartupMigrationRecoveryPreflight open(
            Path canonicalRoot,
            StandaloneDeploymentOwnerView ownerView,
            Duration verificationTimeout,
            Executor abortExecutor);

    static StartupMigrationRecoveryPreflightFactory system() {
        return (root, owner, timeout, executor) -> {
            OwnerBoundStartupMigrationRecoveryPreflight.requireValidOwner(root, owner);
            ManagedMigrationStartupRecoverySession session =
                    new ManagedMigrationStartupRecoverySession(root, timeout, executor);
            return new OwnerBoundStartupMigrationRecoveryPreflight(root, owner, session);
        };
    }
}
