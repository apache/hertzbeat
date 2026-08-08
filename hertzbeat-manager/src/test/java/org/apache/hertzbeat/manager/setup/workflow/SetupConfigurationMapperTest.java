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

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Optional;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.junit.jupiter.api.Test;

class SetupConfigurationMapperTest {
    @Test
    void headlessMappingCopiesCallerOwnedSecretsIntoCoordinatorOwnedBundle() {
        SecretValue metadata = SecretValue.of("metadata-secret");
        SecretValue telemetry = SecretValue.of("telemetry-secret");
        var request = new HeadlessSetupWorkflow.RequiredConfiguration(ApplyMode.MANAGED_WRITE,
                new HeadlessSetupWorkflow.Metadata(MetadataDatabaseKind.H2,
                        "jdbc:h2:./data/setup", "sa", metadata),
                new HeadlessSetupWorkflow.Telemetry("localhost:4001", "http://localhost:4000",
                        "public", Optional.of("greptime"), Optional.of(telemetry)));

        var mapped = SetupConfigurationMapper.map(request);
        metadata.close();
        telemetry.close();

        assertThat(mapped.secrets().metadataDatabasePassword().copy())
                .containsExactly("metadata-secret".toCharArray());
        assertThat(mapped.secrets().telemetryPassword().orElseThrow().copy())
                .containsExactly("telemetry-secret".toCharArray());
        mapped.close();
        assertThat(mapped.secrets().metadataDatabasePassword().copy()).containsOnly('\0');
        assertThat(mapped.secrets().telemetryPassword().orElseThrow().copy()).containsOnly('\0');
    }
}
