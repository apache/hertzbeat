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

package org.apache.hertzbeat.manager.maintenance;

import java.nio.file.Path;
import org.apache.hertzbeat.manager.setup.installation.InstallationConvergenceService;
import org.apache.hertzbeat.manager.setup.installation.InstallationMode;
import org.apache.hertzbeat.manager.setup.installation.InstallationRecordRepository;

/** Normal-context adapter that re-reads fingerprint and database installation state. */
public final class NormalInstallationConvergenceVerifier implements InstallationConvergenceVerifier {

    private final InstallationRecordRepository records;
    private final StandaloneDeploymentOwnerView owner;

    public NormalInstallationConvergenceVerifier(
            InstallationRecordRepository records, StandaloneDeploymentOwnerView owner) {
        this.records = records;
        this.owner = owner;
    }

    @Override
    public boolean isFullyConverged() {
        Path root = owner.installationRoot();
        return new InstallationConvergenceService(
                records, root, root.resolve("data/config/.installation-fingerprint")).classify()
                == InstallationMode.FULL;
    }
}
