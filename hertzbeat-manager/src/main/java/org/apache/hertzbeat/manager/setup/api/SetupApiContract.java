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

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.time.Instant;
import java.util.List;
import java.util.Objects;

/**
 * Unversioned wire and domain contract for first-install setup.
 *
 * <p>The contract deliberately contains no persistence, database creation, or application restart behavior.
 */
public final class SetupApiContract {

    public static final String STATUS_PATH = "/api/setup/status";
    public static final String UNLOCK_PATH = "/api/setup/unlock";
    public static final String VALIDATE_PATH = "/api/setup/validate";
    public static final String CONFIGURATION_PATH = "/api/setup/configuration";
    public static final String OPERATION_PATH = "/api/setup/operations/{operationId}";
    public static final String ADMINISTRATOR_PATH = "/api/setup/administrator";
    public static final String OPTIONS_PATH = "/api/setup/options";
    public static final String EXPORT_PATH = "/api/setup/export";
    public static final String COMPLETE_PATH = "/api/setup/complete";

    private SetupApiContract() {
    }

    private interface WireValue {

        @JsonValue
        String value();
    }

    /** Setup workflow phase. */
    public enum SetupPhase implements WireValue {
        CONFIGURATION_REQUIRED("configuration_required"),
        EXTERNAL_APPLY_REQUIRED("external_apply_required"),
        APPLICATION_STARTING("application_starting"),
        ADMINISTRATOR_REQUIRED("administrator_required"),
        OPTIONAL_CONFIGURATION("optional_configuration"),
        COMPLETE("complete"),
        RECOVERY_REQUIRED("recovery_required"),
        MIGRATION_IN_PROGRESS("migration_in_progress");

        private final String value;

        SetupPhase(String value) {
            this.value = value;
        }

        @Override
        public String value() {
            return value;
        }
    }

    /** Effective configuration origin. */
    public enum ConfigSource implements WireValue {
        BUILT_IN_DEFAULT("built_in_default"),
        UI_MANAGED("ui_managed"),
        EXTERNAL_FILE("external_file"),
        ENVIRONMENT("environment"),
        SYSTEM_PROPERTY("system_property"),
        COMMAND_LINE("command_line");

        private final String value;

        ConfigSource(String value) {
            this.value = value;
        }

        @Override
        public String value() {
            return value;
        }
    }

    /** How validated configuration becomes active. */
    public enum ApplyMode implements WireValue {
        MANAGED_WRITE("managed_write"),
        EXTERNAL_APPLY("external_apply");

        private final String value;

        ApplyMode(String value) {
            this.value = value;
        }

        @Override
        public String value() {
            return value;
        }
    }

    /** Setup access boundary. */
    public enum SetupAccess implements WireValue {
        LOCAL("local"),
        LOCKED("locked"),
        UNLOCKED("unlocked");

        private final String value;

        SetupAccess(String value) {
            this.value = value;
        }

        @Override
        public String value() {
            return value;
        }
    }

    /** Asynchronous operation lifecycle. */
    public enum SetupOperationState implements WireValue {
        PENDING("pending"),
        RUNNING("running"),
        AWAITING_EXTERNAL_APPLY("awaiting_external_apply"),
        AWAITING_RESTART("awaiting_restart"),
        SUCCEEDED("succeeded"),
        FAILED("failed"),
        ROLLED_BACK("rolled_back");

        private final String value;

        SetupOperationState(String value) {
            this.value = value;
        }

        @Override
        public String value() {
            return value;
        }
    }

    /** Supported metadata database. */
    public enum MetadataDatabaseKind implements WireValue {
        H2("h2"),
        MYSQL("mysql"),
        POSTGRESQL("postgresql");

        private final String value;

        MetadataDatabaseKind(String value) {
            this.value = value;
        }

        @Override
        public String value() {
            return value;
        }
    }

    /** Supported telemetry store. */
    public enum TelemetryStoreKind implements WireValue {
        GREPTIME("greptime");

        private final String value;

        TelemetryStoreKind(String value) {
            this.value = value;
        }

        @Override
        public String value() {
            return value;
        }
    }

    /** Independently validated configuration section. */
    public enum ValidationSection implements WireValue {
        METADATA_DATABASE("metadata_database"),
        TELEMETRY_STORE("telemetry_store"),
        PUBLIC_ACCESS("public_access"),
        MAIL("mail");

        private final String value;

        ValidationSection(String value) {
            this.value = value;
        }

        @Override
        public String value() {
            return value;
        }
    }

    /** Mail transport security. */
    public enum MailSecurity implements WireValue {
        NONE("none"),
        STARTTLS("starttls"),
        TLS("tls");

        private final String value;

        MailSecurity(String value) {
            this.value = value;
        }

        @Override
        public String value() {
            return value;
        }
    }

    /** Safe, stable error classification. */
    public enum SetupErrorCode implements WireValue {
        SETUP_COMPLETE("setup_complete"),
        SETUP_LOCKED("setup_locked"),
        SETUP_CODE_INVALID("setup_code_invalid"),
        SETUP_CODE_EXPIRED("setup_code_expired"),
        SETUP_RATE_LIMITED("setup_rate_limited"),
        SETUP_NOT_COMPLETE("setup_not_complete"),
        CONFIG_READ_ONLY("config_read_only"),
        CONFIG_WRITE_FAILED("config_write_failed"),
        CONFIG_RECOVERY_REQUIRED("config_recovery_required"),
        METADATA_CONNECTION_FAILED("metadata_connection_failed"),
        METADATA_KIND_UNSUPPORTED("metadata_kind_unsupported"),
        METADATA_SCHEMA_MISMATCH("metadata_schema_mismatch"),
        METADATA_INSUFFICIENT_PRIVILEGES("metadata_insufficient_privileges"),
        TELEMETRY_CONNECTION_FAILED("telemetry_connection_failed"),
        PUBLIC_ADDRESS_INVALID("public_address_invalid"),
        MAIL_CONNECTION_FAILED("mail_connection_failed"),
        ADMINISTRATOR_ALREADY_CONFIGURED("administrator_already_configured"),
        ADMINISTRATOR_USERNAME_INVALID("administrator_username_invalid"),
        OPERATION_NOT_FOUND("operation_not_found"),
        OPERATION_CONFLICT("operation_conflict"),
        MIGRATION_SOURCE_UNSUPPORTED("migration_source_unsupported"),
        MIGRATION_TARGET_NOT_EMPTY("migration_target_not_empty"),
        MIGRATION_MULTI_NODE_UNSUPPORTED("migration_multi_node_unsupported"),
        MIGRATION_COPY_FAILED("migration_copy_failed"),
        MIGRATION_VERIFICATION_FAILED("migration_verification_failed"),
        MIGRATION_ACTIVATION_FAILED("migration_activation_failed"),
        RESTART_FAILED("restart_failed");

        private final String value;

        SetupErrorCode(String value) {
            this.value = value;
        }

        @Override
        public String value() {
            return value;
        }
    }

    /** Stable warning codes acknowledged during setup completion. */
    public enum SetupWarningCode implements WireValue {
        EXTERNAL_APPLY_REQUIRED("external_apply_required"),
        RESTART_REQUIRED("restart_required"),
        PUBLIC_ADDRESS_PLAINTEXT("public_address_plaintext"),
        MAIL_SECURITY_NONE("mail_security_none"),
        H2_NON_PRODUCTION("h2_non_production");

        private final String value;

        SetupWarningCode(String value) {
            this.value = value;
        }

        @Override
        public String value() {
            return value;
        }
    }

    /** Safe setup status. */
    public record StatusResponse(
            @NotNull SetupPhase phase,
            @NotNull Instant observedAt,
            @NotNull SetupAccess access,
            @NotNull ApplyMode applyMode,
            boolean writableManagedConfig,
            String operationId,
            SetupErrorCode errorCode,
            @NotNull @Valid ManagementDatabaseSummary managementDatabase,
            @NotNull @Valid TelemetryStoreSummary telemetryStore,
            boolean administratorConfigured,
            @NotNull @Valid OptionalConfigurationSummary optional,
            @NotNull List<SetupWarningCode> pendingWarnings) {

        public StatusResponse(SetupPhase phase, Instant observedAt, SetupAccess access, ApplyMode applyMode,
                              boolean writableManagedConfig, String operationId, SetupErrorCode errorCode,
                              ManagementDatabaseSummary managementDatabase, TelemetryStoreSummary telemetryStore,
                              boolean administratorConfigured, OptionalConfigurationSummary optional) {
            this(phase, observedAt, access, applyMode, writableManagedConfig, operationId, errorCode,
                    managementDatabase, telemetryStore, administratorConfigured, optional, List.of());
        }
    }

    /** Secret-free metadata database summary. */
    public record ManagementDatabaseSummary(
            MetadataDatabaseKind kind,
            boolean configured,
            @NotNull ConfigSource source,
            boolean restartRequired) {
    }

    /** Secret-free telemetry store summary. */
    public record TelemetryStoreSummary(
            @NotNull TelemetryStoreKind kind,
            boolean configured,
            @NotNull ConfigSource source,
            boolean restartRequired) {

        public TelemetryStoreSummary {
            if (kind != TelemetryStoreKind.GREPTIME) {
                throw new IllegalArgumentException("Only Greptime telemetry storage is supported");
            }
        }
    }

    /** Secret-free optional configuration status. */
    public record OptionalConfigurationSummary(
            boolean publicAccessConfigured,
            boolean serverOtlpHttpConfigured,
            boolean serverOtlpGrpcConfigured,
            boolean retentionConfigured,
            boolean mailConfigured) {
    }

    /** One-time unlock proof. */
    public record UnlockRequest(
            @NotBlank @JsonProperty(access = JsonProperty.Access.WRITE_ONLY) String code) {

        @Override
        public String toString() {
            return "UnlockRequest[code=<redacted>]";
        }
    }

    /** Successful unlock result. */
    public record UnlockResponse(@NotNull SetupAccess access, @NotNull Instant expiresAt) {

        public UnlockResponse {
            if (access != SetupAccess.UNLOCKED) {
                throw new IllegalArgumentException("An unlock response must report unlocked access");
            }
        }
    }

    /** Metadata database input. */
    public record MetadataDatabaseConfiguration(
            @NotNull MetadataDatabaseKind kind,
            @NotBlank String jdbcUrl,
            @NotBlank String username,
            @NotBlank @JsonProperty(access = JsonProperty.Access.WRITE_ONLY) String password) {

        @Override
        public String toString() {
            return "MetadataDatabaseConfiguration[kind=" + kind + ", password=<redacted>]";
        }
    }

    /** Telemetry store input. */
    public record TelemetryStoreConfiguration(
            @NotNull TelemetryStoreKind kind,
            @NotBlank String grpcEndpoints,
            @NotBlank String httpEndpoint,
            @NotBlank String database,
            String username,
            @JsonProperty(access = JsonProperty.Access.WRITE_ONLY) String password) {

        public TelemetryStoreConfiguration {
            if (kind != TelemetryStoreKind.GREPTIME) {
                throw new IllegalArgumentException("Only Greptime telemetry storage is supported");
            }
            username = normalizeCredential(username);
            password = normalizeCredential(password);
            if (hasText(username) != hasText(password)) {
                throw new IllegalArgumentException("Greptime username and password must be supplied together");
            }
        }

        private static String normalizeCredential(String value) {
            return value == null || value.isBlank() ? null : value;
        }

        @Override
        public String toString() {
            return "TelemetryStoreConfiguration[kind=" + kind + ", password=<redacted>]";
        }
    }

    /** Public endpoint input; HTTP and HTTPS are both contractually valid. */
    public record PublicAccessConfiguration(
            String publicBaseUrl,
            String serverOtlpHttpEndpoint,
            String serverOtlpGrpcEndpoint) {
    }

    /** Mail input. */
    public record MailConfiguration(
            @NotBlank String host,
            @Positive int port,
            @NotNull MailSecurity security,
            String username,
            @JsonProperty(access = JsonProperty.Access.WRITE_ONLY) String password,
            @NotBlank String fromAddress) {

        public MailConfiguration {
            if (port <= 0) {
                throw new IllegalArgumentException("Mail port must be positive");
            }
        }

        @Override
        public String toString() {
            return "MailConfiguration[host=" + host + ", port=" + port + ", security=" + security
                    + ", password=<redacted>]";
        }
    }

    /** Exactly one configuration section validation input. */
    public record ValidateRequest(
            @NotNull ValidationSection section,
            @Valid MetadataDatabaseConfiguration managementDatabase,
            @Valid TelemetryStoreConfiguration telemetryStore,
            @Valid PublicAccessConfiguration publicAccess,
            @Valid MailConfiguration mail) {

        public ValidateRequest {
            Objects.requireNonNull(section, "section");
            int supplied = countPresent(managementDatabase, telemetryStore, publicAccess, mail);
            boolean matches = switch (section) {
                case METADATA_DATABASE -> managementDatabase != null;
                case TELEMETRY_STORE -> telemetryStore != null;
                case PUBLIC_ACCESS -> publicAccess != null;
                case MAIL -> mail != null;
            };
            if (supplied != 1 || !matches) {
                throw new IllegalArgumentException("Exactly the selected validation section must be supplied");
            }
        }
    }

    /** Safe validation result. */
    public record ValidationResponse(
            boolean valid,
            @NotNull Instant observedAt,
            SetupErrorCode errorCode,
            @NotNull List<SetupWarningCode> warnings) {

        public ValidationResponse {
            warnings = List.copyOf(warnings);
        }
    }

    /** Validated required configuration input. */
    public record ConfigurationRequest(
            @NotNull SetupPhase expectedPhase,
            @NotNull ApplyMode applyMode,
            @NotNull @Valid MetadataDatabaseConfiguration managementDatabase,
            @NotNull @Valid TelemetryStoreConfiguration telemetryStore) {
    }

    /** Configuration operation acknowledgement. */
    public record ConfigurationResponse(
            @NotBlank String operationId,
            @NotNull SetupOperationState state,
            @NotNull SetupPhase phase,
            @PositiveOrZero long nextPollAfterMillis,
            boolean exportAvailable) {
    }

    /** Safe asynchronous operation view. */
    public record OperationResponse(
            @NotBlank String operationId,
            @NotNull SetupOperationState state,
            @NotNull SetupPhase phase,
            @NotNull Instant createdAt,
            Instant startedAt,
            Instant completedAt,
            SetupErrorCode errorCode,
            @PositiveOrZero long nextPollAfterMillis,
            boolean exportAvailable) {
    }

    /** Initial administrator input. */
    public record AdministratorRequest(
            @NotBlank String username,
            @NotBlank @JsonProperty(access = JsonProperty.Access.WRITE_ONLY) String password) {

        @Override
        public String toString() {
            return "AdministratorRequest[username=" + username + ", password=<redacted>]";
        }
    }

    /** Initial administrator result. */
    public record AdministratorResponse(@NotBlank String username, @NotNull SetupPhase phase) {
    }

    /** Optional retention input. */
    public record RetentionConfiguration(
            @Positive Integer metricsDays,
            @Positive Integer logsDays,
            @Positive Integer tracesDays) {

        public RetentionConfiguration {
            requirePositiveIfPresent(metricsDays);
            requirePositiveIfPresent(logsDays);
            requirePositiveIfPresent(tracesDays);
        }
    }

    /** Optional setup input. */
    public record OptionsRequest(
            @Valid PublicAccessConfiguration publicAccess,
            @Valid RetentionConfiguration retention,
            @Valid MailConfiguration mail) {
    }

    /** Secret-free optional setup result. */
    public record OptionsResponse(
            boolean publicAccessConfigured,
            boolean serverOtlpHttpConfigured,
            boolean serverOtlpGrpcConfigured,
            boolean retentionConfigured,
            boolean mailConfigured,
            @NotNull SetupPhase phase) {
    }

    /** Supported external configuration export. */
    public enum ExportFormat implements WireValue {
        YAML("yaml"),
        ENV("env"),
        KUBERNETES_SECRET("kubernetes_secret");

        private final String value;

        ExportFormat(String value) {
            this.value = value;
        }

        @Override
        public String value() {
            return value;
        }
    }

    /** Export input. */
    public record ExportRequest(
            @NotNull ExportFormat format,
            @NotNull @Valid ConfigurationRequest configuration) {
    }

    /** Safe download metadata. Secret-bearing content is written only as a no-store attachment. */
    public record ExportResponse(@NotBlank String fileName, @NotBlank String mediaType) {
    }

    /** Setup completion acknowledgement. */
    public record CompleteRequest(
            @NotNull SetupPhase expectedPhase,
            @NotNull List<SetupWarningCode> acknowledgedWarnings) {

        public CompleteRequest {
            acknowledgedWarnings = List.copyOf(acknowledgedWarnings);
        }
    }

    /** Completed setup result. */
    public record CompleteResponse(
            @NotNull SetupPhase phase,
            @NotNull Instant completedAt,
            @NotBlank String loginPath,
            @NotBlank String username) {

        public CompleteResponse {
            if (phase != SetupPhase.COMPLETE) {
                throw new IllegalArgumentException("A complete response must report the complete phase");
            }
        }
    }

    private static int countPresent(Object... values) {
        int count = 0;
        for (Object value : values) {
            if (value != null) {
                count++;
            }
        }
        return count;
    }

    private static void requirePositiveIfPresent(Integer value) {
        if (value != null && value <= 0) {
            throw new IllegalArgumentException("Retention days must be positive when supplied");
        }
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
