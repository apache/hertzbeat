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

package org.apache.hertzbeat.manager.setup.unattended;

import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.StatusResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupWarningCode;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.apache.hertzbeat.manager.setup.runtime.SetupRuntimeTransitionScheduler;
import org.apache.hertzbeat.manager.setup.workflow.HeadlessSetupWorkflow;
import org.springframework.core.env.Environment;

/** Idempotent headless driver over the same public workflow and validators used by the browser. */
public final class UnattendedSetupInitializer {
    public static final String ENABLED_PROPERTY = "hertzbeat.setup.unattended.enabled";
    private static final String METADATA = "hertzbeat.setup.metadata";
    private static final String TELEMETRY = "hertzbeat.setup.telemetry";
    private static final String ADMINISTRATOR = "hertzbeat.setup.administrator";
    private static final String ACKNOWLEDGED_WARNINGS =
            "hertzbeat.setup.unattended.acknowledged-warnings";
    private final HeadlessSetupWorkflow workflow;
    private final Environment environment;
    private final SetupPasswordFileLoader passwords;
    private final Optional<SetupRuntimeTransitionScheduler> transitions;

    public UnattendedSetupInitializer(
            HeadlessSetupWorkflow workflow, Environment environment, SetupPasswordFileLoader passwords) {
        this(workflow, environment, passwords, Optional.empty());
    }

    public UnattendedSetupInitializer(HeadlessSetupWorkflow workflow, Environment environment,
                                      SetupPasswordFileLoader passwords,
                                      Optional<SetupRuntimeTransitionScheduler> transitions) {
        this.workflow = workflow;
        this.environment = environment;
        this.passwords = passwords;
        this.transitions = transitions;
    }

    public void initialize() {
        if (!environment.getProperty(ENABLED_PROPERTY, Boolean.class, false)) {
            return;
        }
        StatusResponse status = workflow.status();
        switch (status.phase()) {
            case CONFIGURATION_REQUIRED -> configure(status);
            case ADMINISTRATOR_REQUIRED -> createAdministrator();
            case OPTIONAL_CONFIGURATION -> complete();
            case COMPLETE, EXTERNAL_APPLY_REQUIRED, APPLICATION_STARTING,
                    RECOVERY_REQUIRED, MIGRATION_IN_PROGRESS -> {
                // A restart, external operator action, or recovery must converge state before another write.
            }
            default -> throw new IllegalStateException("Unsupported unattended setup phase");
        }
    }

    private void configure(StatusResponse status) {
        try (SetupPasswordFileLoader.Password metadataPassword = passwords.read(
                SetupPasswordFileLoader.requireFilePath(environment, METADATA));
             SecretValue metadataSecret = metadataPassword.secretValue()) {
            HeadlessSetupWorkflow.Metadata metadata = new HeadlessSetupWorkflow.Metadata(
                    MetadataDatabaseKind.valueOf(required(METADATA + ".kind").toUpperCase()),
                    required(METADATA + ".jdbc-url"), required(METADATA + ".username"), metadataSecret);
            configureTelemetry(status, metadata);
        }
    }

    private void configureTelemetry(StatusResponse status, HeadlessSetupWorkflow.Metadata metadata) {
        String username = environment.getProperty(TELEMETRY + ".username");
        String passwordFile = environment.getProperty(TELEMETRY + ".password-file");
        if (username == null && passwordFile == null) {
            rejectPlainPassword(TELEMETRY);
            configure(status, metadata, telemetry(Optional.empty(), Optional.empty()));
            return;
        }
        Path path = SetupPasswordFileLoader.requireFilePath(environment, TELEMETRY);
        try (SetupPasswordFileLoader.Password password = passwords.read(path);
             SecretValue secret = password.secretValue()) {
            configure(status, metadata, telemetry(
                    Optional.of(required(TELEMETRY + ".username")), Optional.of(secret)));
        }
    }

    private HeadlessSetupWorkflow.Telemetry telemetry(
            Optional<String> username, Optional<SecretValue> password) {
        return new HeadlessSetupWorkflow.Telemetry(
                required(TELEMETRY + ".grpc-endpoints"), required(TELEMETRY + ".http-endpoint"),
                required(TELEMETRY + ".database"), username, password);
    }

    private void configure(StatusResponse status, HeadlessSetupWorkflow.Metadata metadata,
                           HeadlessSetupWorkflow.Telemetry telemetry) {
        var response = workflow.configure(
                new HeadlessSetupWorkflow.RequiredConfiguration(status.applyMode(), metadata, telemetry));
        if (response.phase() == SetupPhase.APPLICATION_STARTING) {
            transitions.ifPresent(SetupRuntimeTransitionScheduler::configurationApplied);
        }
    }

    private void createAdministrator() {
        Path path = SetupPasswordFileLoader.requireFilePath(environment, ADMINISTRATOR);
        try (SetupPasswordFileLoader.Password password = passwords.read(path);
             SecretValue secret = password.secretValue()) {
            workflow.createAdministrator(required(ADMINISTRATOR + ".username"), secret);
        }
        complete();
    }

    private void complete() {
        workflow.complete(acknowledgedWarnings());
        transitions.ifPresent(SetupRuntimeTransitionScheduler::installationCompleted);
    }

    private List<SetupWarningCode> acknowledgedWarnings() {
        String configured = environment.getProperty(ACKNOWLEDGED_WARNINGS, "");
        if (configured.isBlank()) {
            return List.of();
        }
        return Arrays.stream(configured.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .map(value -> SetupWarningCode.valueOf(value.toUpperCase(Locale.ROOT)))
                .toList();
    }

    private String required(String key) {
        String value = environment.getProperty(key);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Required unattended setup property is missing");
        }
        return value;
    }

    private void rejectPlainPassword(String prefix) {
        if (environment.getProperty(prefix + ".password") != null) {
            throw new IllegalStateException("Plain setup password configuration is forbidden");
        }
    }
}
