/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
