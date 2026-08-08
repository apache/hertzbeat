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

package org.apache.hertzbeat.manager.setup.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.RecordComponent;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.AdministratorRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigSource;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ExportResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MailConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MailSecurity;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ServerInstrumentationConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupAccess;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupOperationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.UnlockRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ValidateRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ValidationSection;
import org.junit.jupiter.api.Test;

/** Freezes the unversioned first-install setup contract. */
class SetupApiContractTest {

    private static final String SECRET = "contract-secret";

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Test
    void freezesRoutesAndWireEnums() throws Exception {
        assertEquals("/api/setup/status", SetupApiContract.STATUS_PATH);
        assertEquals("/api/setup/unlock", SetupApiContract.UNLOCK_PATH);
        assertEquals("/api/setup/validate", SetupApiContract.VALIDATE_PATH);
        assertEquals("/api/setup/configuration", SetupApiContract.CONFIGURATION_PATH);
        assertEquals("/api/setup/operations/{operationId}", SetupApiContract.OPERATION_PATH);
        assertEquals("/api/setup/administrator", SetupApiContract.ADMINISTRATOR_PATH);
        assertEquals("/api/setup/options", SetupApiContract.OPTIONS_PATH);
        assertEquals("/api/setup/export", SetupApiContract.EXPORT_PATH);
        assertEquals("/api/setup/complete", SetupApiContract.COMPLETE_PATH);
        assertWireValues(SetupPhase.values(), "configuration_required", "external_apply_required",
                "application_starting", "administrator_required", "optional_configuration", "complete",
                "recovery_required", "migration_in_progress");
        assertWireValues(ConfigSource.values(), "built_in_default", "ui_managed", "external_file", "environment",
                "system_property", "command_line");
        assertWireValues(ApplyMode.values(), "managed_write", "external_apply");
        assertWireValues(SetupAccess.values(), "local", "locked", "unlocked");
        assertWireValues(SetupOperationState.values(), "pending", "running", "awaiting_external_apply",
                "awaiting_restart", "succeeded", "failed", "rolled_back");
        assertWireValues(MetadataDatabaseKind.values(), "h2", "mysql", "postgresql");
        assertWireValues(TelemetryStoreKind.values(), "greptime");
        assertWireValues(ValidationSection.values(), "metadata_database", "telemetry_store",
                "server_instrumentation", "mail");
        assertWireValues(MailSecurity.values(), "none", "starttls", "tls");
        assertWireValues(SetupApiContract.ExportFormat.values(), "yaml", "env", "kubernetes_secret");
        assertWireValues(SetupApiContract.SetupWarningCode.values(), "external_apply_required", "restart_required",
                "server_otlp_plaintext", "mail_security_none", "h2_non_production");
    }

    @Test
    void freezesSafeStatusAndMutationShapes() {
        assertComponents(SetupApiContract.StatusResponse.class, "phase", "observedAt", "access", "applyMode",
                "writableManagedConfig", "operationId", "errorCode", "managementDatabase", "telemetryStore",
                "administratorConfigured", "optional", "pendingWarnings");
        assertComponents(SetupApiContract.ManagementDatabaseSummary.class, "kind", "configured", "source",
                "restartRequired");
        assertComponents(SetupApiContract.TelemetryStoreSummary.class, "kind", "configured", "source",
                "restartRequired");
        assertComponents(SetupApiContract.OptionalConfigurationSummary.class, "serverOtlpHttpConfigured",
                "serverOtlpGrpcConfigured", "retentionConfigured", "mailConfigured");
        assertComponents(SetupApiContract.UnlockRequest.class, "code");
        assertComponents(SetupApiContract.UnlockResponse.class, "access", "expiresAt");
        assertComponents(SetupApiContract.ValidateRequest.class, "section", "managementDatabase", "telemetryStore",
                "serverInstrumentation", "mail");
        assertComponents(SetupApiContract.TelemetryStoreConfiguration.class, "kind", "grpcEndpoints", "httpEndpoint",
                "database", "username", "password");
        assertComponents(SetupApiContract.ValidationResponse.class, "valid", "observedAt", "errorCode", "warnings");
        assertComponents(SetupApiContract.ConfigurationRequest.class, "expectedPhase", "applyMode",
                "managementDatabase", "telemetryStore");
        assertComponents(SetupApiContract.ConfigurationResponse.class, "operationId", "state", "phase",
                "nextPollAfterMillis", "exportAvailable");
        assertComponents(SetupApiContract.OperationResponse.class, "operationId", "state", "phase", "createdAt",
                "startedAt", "completedAt", "errorCode", "nextPollAfterMillis", "exportAvailable");
        assertComponents(SetupApiContract.AdministratorRequest.class, "username", "password");
        assertComponents(SetupApiContract.AdministratorResponse.class, "username", "phase");
        assertComponents(SetupApiContract.OptionsRequest.class, "serverInstrumentation", "retention", "mail");
        assertComponents(SetupApiContract.RetentionConfiguration.class, "days");
        assertComponents(SetupApiContract.OptionsResponse.class, "serverOtlpHttpConfigured",
                "serverOtlpGrpcConfigured", "retentionConfigured", "mailConfigured", "phase");
        assertComponents(SetupApiContract.ExportRequest.class, "format", "configuration");
        assertComponents(SetupApiContract.ExportResponse.class, "fileName", "mediaType");
        assertComponents(SetupApiContract.CompleteRequest.class, "expectedPhase", "acknowledgedWarnings");
        assertComponents(SetupApiContract.CompleteResponse.class, "phase", "completedAt", "loginPath", "username");
    }

    @Test
    void exportMetadataRejectsUnsafeAttachmentHeaders() {
        assertThrows(IllegalArgumentException.class,
                () -> new ExportResponse("../managed.env", "text/plain"));
        assertThrows(IllegalArgumentException.class,
                () -> new ExportResponse("managed/env", "text/plain"));
        assertThrows(IllegalArgumentException.class,
                () -> new ExportResponse("managed\\env", "text/plain"));
        assertThrows(IllegalArgumentException.class,
                () -> new ExportResponse("managed\r\nenv", "text/plain"));
        assertThrows(IllegalArgumentException.class,
                () -> new ExportResponse("managed.env", "text/plain\r\nx-test: value"));
        assertThrows(IllegalArgumentException.class,
                () -> new ExportResponse("managed.env", "text\\plain"));
    }

    @Test
    void secretInputsAreWriteOnlyAndSafeToRender() throws Exception {
        MetadataDatabaseConfiguration metadata = new MetadataDatabaseConfiguration(
                MetadataDatabaseKind.MYSQL, "jdbc:mysql://db/hertzbeat", "user", SECRET);
        TelemetryStoreConfiguration telemetry = new TelemetryStoreConfiguration(
                TelemetryStoreKind.GREPTIME, "greptime:4001", "http://greptime:4000", "public", "user", SECRET);
        MailConfiguration mail = new MailConfiguration(
                "mail.example.test", 587, MailSecurity.STARTTLS, "user", SECRET, "ops@example.test");
        SetupApiContract.ConfigurationRequest configuration = new SetupApiContract.ConfigurationRequest(
                SetupPhase.CONFIGURATION_REQUIRED, ApplyMode.MANAGED_WRITE, metadata, telemetry);
        List<Object> requests = List.of(
                new UnlockRequest(SECRET),
                new AdministratorRequest("admin", SECRET),
                metadata,
                telemetry,
                mail,
                new ValidateRequest(ValidationSection.METADATA_DATABASE, metadata, null, null, null),
                configuration,
                new SetupApiContract.OptionsRequest(null, null, mail),
                new SetupApiContract.ExportRequest(SetupApiContract.ExportFormat.YAML, configuration));
        for (Object request : requests) {
            assertFalse(objectMapper.writeValueAsString(request).contains(SECRET));
            assertFalse(request.toString().contains(SECRET));
        }
        UnlockRequest decoded = objectMapper.readValue("{\"code\":\"" + SECRET + "\"}", UnlockRequest.class);
        assertEquals(SECRET, decoded.code());
    }

    @Test
    void validateRequestRequiresExactlyOneMatchingSection() {
        MetadataDatabaseConfiguration metadata = new MetadataDatabaseConfiguration(
                MetadataDatabaseKind.POSTGRESQL, "jdbc:postgresql://db/hertzbeat", "user", SECRET);
        assertEquals(metadata, new ValidateRequest(
                ValidationSection.METADATA_DATABASE, metadata, null, null, null).managementDatabase());
        assertThrows(IllegalArgumentException.class,
                () -> new ValidateRequest(ValidationSection.METADATA_DATABASE, null, null, null, null));
        assertThrows(IllegalArgumentException.class, () -> new ValidateRequest(
                ValidationSection.METADATA_DATABASE, metadata, null,
                new ServerInstrumentationConfiguration("http://localhost:4318", null), null));
        assertThrows(IllegalArgumentException.class, () -> new ValidateRequest(
                ValidationSection.MAIL, metadata, null, null, null));
    }

    @Test
    void greptimeCredentialsAreOptionalButMustBeSuppliedTogether() {
        TelemetryStoreConfiguration anonymous = new TelemetryStoreConfiguration(
                TelemetryStoreKind.GREPTIME, "greptime:4001", "http://greptime:4000", "public", null, null);

        assertNull(anonymous.username());
        TelemetryStoreConfiguration blank = new TelemetryStoreConfiguration(
                TelemetryStoreKind.GREPTIME, "greptime:4001", "http://greptime:4000", "public", " ", "\t");
        assertNull(blank.username());
        assertNull(blank.password());
        assertThrows(IllegalArgumentException.class, () -> new TelemetryStoreConfiguration(
                TelemetryStoreKind.GREPTIME, "greptime:4001", "http://greptime:4000", "public", "user", null));
        assertThrows(IllegalArgumentException.class, () -> new TelemetryStoreConfiguration(
                TelemetryStoreKind.GREPTIME, "greptime:4001", "http://greptime:4000", "public", null, SECRET));
    }

    @Test
    void freezesStableSafeErrorCodes() throws Exception {
        assertWireValues(SetupErrorCode.values(), "setup_complete", "setup_locked", "setup_code_invalid",
                "setup_code_expired", "setup_rate_limited", "setup_not_complete", "invalid_request", "internal_error",
                "config_read_only", "config_write_failed",
                "config_recovery_required", "metadata_connection_failed", "metadata_kind_unsupported",
                "metadata_schema_mismatch", "metadata_insufficient_privileges", "telemetry_connection_failed",
                "server_instrumentation_invalid", "mail_connection_failed", "administrator_already_configured",
                "administrator_username_invalid", "operation_not_found", "operation_conflict",
                "migration_source_unsupported", "migration_target_not_empty", "migration_multi_node_unsupported",
                "migration_copy_failed", "migration_verification_failed", "migration_activation_failed",
                "restart_failed");
    }

    @Test
    void safeStatusContainsNoConnectionDetails() throws Exception {
        SetupApiContract.StatusResponse response = new SetupApiContract.StatusResponse(
                SetupPhase.CONFIGURATION_REQUIRED,
                Instant.parse("2026-08-07T00:00:00Z"),
                SetupAccess.LOCAL,
                ApplyMode.MANAGED_WRITE,
                true,
                null,
                null,
                new SetupApiContract.ManagementDatabaseSummary(
                        MetadataDatabaseKind.H2, true, ConfigSource.BUILT_IN_DEFAULT, false),
                new SetupApiContract.TelemetryStoreSummary(
                        TelemetryStoreKind.GREPTIME, false, ConfigSource.BUILT_IN_DEFAULT, false),
                false,
                new SetupApiContract.OptionalConfigurationSummary(false, false, false, false));
        String json = objectMapper.writeValueAsString(response);
        assertFalse(json.contains("jdbc"));
        assertFalse(json.contains("username"));
        assertFalse(json.contains("password"));
        assertFalse(json.contains("exception"));
        assertFalse(json.contains("fingerprint"));
    }

    private void assertComponents(Class<? extends Record> type, String... names) {
        assertEquals(List.of(names), Arrays.stream(type.getRecordComponents()).map(RecordComponent::getName).toList());
    }

    private void assertWireValues(Enum<?>[] values, String... expected) throws Exception {
        assertEquals(List.of(expected), Arrays.stream(values).map(this::wireValue).toList());
    }

    private String wireValue(Enum<?> value) {
        try {
            return objectMapper.writeValueAsString(value).replace("\"", "");
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }
}
