/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.VerificationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;

/** Strict versioned codec whose vocabulary cannot represent credentials, SQL, or row contents. */
final class MigrationOperationFileCodec {

    private static final String ABSENT = "-";
    private static final String SCHEMA_VERSION = "2";
    private static final int FIELD_COUNT = 18;
    private final MigrationOperationCollectionPolicy collectionPolicy = new MigrationOperationCollectionPolicy();

    byte[] encode(List<MigrationOperationSnapshot> snapshots) {
        StringBuilder output = new StringBuilder("schema=").append(SCHEMA_VERSION)
                .append("\ncount=").append(snapshots.size()).append('\n');
        for (int index = 0; index < snapshots.size(); index++) {
            append(output, index, snapshots.get(index));
        }
        return output.toString().getBytes(StandardCharsets.UTF_8);
    }

    List<MigrationOperationSnapshot> decode(byte[] encoded) {
        Map<String, String> fields = fields(new String(encoded, StandardCharsets.UTF_8));
        if (!SCHEMA_VERSION.equals(fields.remove("schema"))) {
            throw new IllegalArgumentException("Unknown migration operation schema");
        }
        int count = integer(fields.remove("count"));
        if (count < 0 || count > FileMigrationOperationStore.HISTORY_LIMIT + 1
                || fields.size() != count * FIELD_COUNT) {
            throw new IllegalArgumentException("Invalid migration operation count");
        }
        List<MigrationOperationSnapshot> snapshots = new ArrayList<>(count);
        for (int index = 0; index < count; index++) {
            snapshots.add(snapshot(fields, index));
        }
        if (!fields.isEmpty()) {
            throw new IllegalArgumentException("Unknown migration operation fields");
        }
        collectionPolicy.validate(snapshots);
        return snapshots;
    }

    private void append(StringBuilder output, int index, MigrationOperationSnapshot value) {
        String prefix = index + ".";
        field(output, prefix, "operationId", value.operationId());
        field(output, prefix, "state", value.state().name());
        field(output, prefix, "target", value.target().name());
        field(output, prefix, "applyMode", value.applyMode().name());
        field(output, prefix, "stage", value.stage().name());
        field(output, prefix, "progress", Integer.toString(value.progressPercent()));
        field(output, prefix, "createdAt", value.createdAt().toString());
        field(output, prefix, "startedAt", optional(value.startedAt()));
        field(output, prefix, "completedAt", optional(value.completedAt()));
        field(output, prefix, "verification", value.verificationState().name());
        field(output, prefix, "errorCode", optional(value.errorCode()));
        field(output, prefix, "rollbackOrigin", optional(value.rollbackOrigin()));
        field(output, prefix, "pollMillis", Long.toString(value.nextPollAfterMillis()));
        field(output, prefix, "activation", Boolean.toString(value.activationAvailable()));
        field(output, prefix, "restart", Boolean.toString(value.restartRequired()));
        field(output, prefix, "external", Boolean.toString(value.externalApplyRequired()));
        field(output, prefix, "targetIdentityHash", value.targetIdentityHash());
        field(output, prefix, "managedCandidateGeneration", optional(value.managedCandidateGeneration()));
    }

    private MigrationOperationSnapshot snapshot(Map<String, String> fields, int index) {
        String prefix = index + ".";
        return new MigrationOperationSnapshot(
                take(fields, prefix, "operationId"),
                value(MigrationOperationState.class, take(fields, prefix, "state")),
                value(MigrationTarget.class, take(fields, prefix, "target")),
                value(ApplyMode.class, take(fields, prefix, "applyMode")),
                value(MigrationStage.class, take(fields, prefix, "stage")),
                integer(take(fields, prefix, "progress")),
                Instant.parse(take(fields, prefix, "createdAt")),
                instant(take(fields, prefix, "startedAt")),
                instant(take(fields, prefix, "completedAt")),
                value(VerificationState.class, take(fields, prefix, "verification")),
                error(take(fields, prefix, "errorCode")),
                rollbackOrigin(take(fields, prefix, "rollbackOrigin")),
                Long.parseLong(take(fields, prefix, "pollMillis")),
                bool(take(fields, prefix, "activation")),
                bool(take(fields, prefix, "restart")),
                bool(take(fields, prefix, "external")),
                take(fields, prefix, "targetIdentityHash"),
                nullable(take(fields, prefix, "managedCandidateGeneration")));
    }

    private Map<String, String> fields(String content) {
        Map<String, String> fields = new HashMap<>();
        for (String line : content.split("\\n", -1)) {
            if (line.isEmpty()) {
                continue;
            }
            int separator = line.indexOf('=');
            if (separator <= 0 || separator == line.length() - 1
                    || fields.put(line.substring(0, separator), line.substring(separator + 1)) != null) {
                throw new IllegalArgumentException("Malformed migration operation field");
            }
        }
        return fields;
    }

    private String take(Map<String, String> fields, String prefix, String name) {
        String value = fields.remove(prefix + name);
        if (value == null) {
            throw new IllegalArgumentException("Missing migration operation field");
        }
        return value;
    }

    private void field(StringBuilder output, String prefix, String name, String value) {
        if (value.indexOf('\n') >= 0 || value.indexOf('=') >= 0) {
            throw new IllegalArgumentException("Unsafe migration operation field");
        }
        output.append(prefix).append(name).append('=').append(value).append('\n');
    }

    private String optional(Object value) {
        return value == null ? ABSENT : value.toString();
    }

    private Instant instant(String value) {
        return ABSENT.equals(value) ? null : Instant.parse(value);
    }

    private String nullable(String value) {
        return ABSENT.equals(value) ? null : value;
    }

    private SetupErrorCode error(String value) {
        return ABSENT.equals(value) ? null : value(SetupErrorCode.class, value);
    }

    private MigrationRollbackOrigin rollbackOrigin(String value) {
        return ABSENT.equals(value) ? null : value(MigrationRollbackOrigin.class, value);
    }

    private int integer(String value) {
        return Integer.parseInt(value);
    }

    private boolean bool(String value) {
        if (!"true".equals(value) && !"false".equals(value)) {
            throw new IllegalArgumentException("Invalid migration operation boolean");
        }
        return Boolean.parseBoolean(value);
    }

    private <T extends Enum<T>> T value(Class<T> type, String value) {
        return Enum.valueOf(type, value);
    }
}
