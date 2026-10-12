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

import java.util.List;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigSource;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ManagementDatabaseSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.OptionalConfigurationSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupWarningCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreSummary;

/** Secret-free effective configuration state displayed by setup status. */
public record SetupConfigurationProjection(
        ManagementDatabaseSummary managementDatabase,
        TelemetryStoreSummary telemetryStore,
        OptionalConfigurationSummary optional,
        List<SetupWarningCode> warnings) {

    public SetupConfigurationProjection {
        warnings = List.copyOf(warnings);
    }

    public static SetupConfigurationProjection defaults() {
        return new SetupConfigurationProjection(
                new ManagementDatabaseSummary(MetadataDatabaseKind.H2, false,
                        ConfigSource.BUILT_IN_DEFAULT, false),
                new TelemetryStoreSummary(TelemetryStoreKind.GREPTIME, false,
                        ConfigSource.BUILT_IN_DEFAULT, false),
                new OptionalConfigurationSummary(false, false, false, false, false),
                List.of(SetupWarningCode.H2_NON_PRODUCTION));
    }
}
