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

package org.apache.hertzbeat.common.observability.dto.log;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;

/** Exact, managed-workspace ERROR messages; no templates, FATAL events or sampled counts. */
public final class LogRepeatedErrors {
    public static final int ROW_BUDGET = 10000;
    public static final int MESSAGE_BUDGET = 8192;
    public static final int GROUP_LIMIT = 3;

    private LogRepeatedErrors() { }

    /** Trusted workspace and exact bounded event-time window. */
    public record Scope(String workspaceId, long start, long end, String serviceName, String environment) {
        public Scope {
            if (workspaceId == null || workspaceId.isBlank() || workspaceId.length() > 128
                    || start < 0 || end <= start || end - start > 900000) {
                throw new IllegalArgumentException("Invalid repeated error scope");
            }
            serviceName = dimension(serviceName);
            environment = dimension(environment);
        }
    }

    /** Opaque group identity plus one persisted representative; no message in the URL. */
    public record Selection(String groupKey, String representativeUid) {
        public Selection {
            if (groupKey == null || !groupKey.matches("[a-f0-9]{64}")
                    || representativeUid == null || !representativeUid.matches("[A-Za-z0-9][A-Za-z0-9._:-]{0,127}")) {
                throw new IllegalArgumentException("Invalid repeated error selection");
            }
        }
    }

    /** One exact message tuple with a bounded operator-facing summary. */
    public record Group(String groupKey, String serviceName, String environment, long count,
                        long lastSeen, String summary, String representativeUid) {
        public Group {
            if (groupKey == null || !groupKey.matches("[a-f0-9]{64}") || count < 2 || lastSeen < 0
                    || summary == null || summary.length() > 240) {
                throw new IllegalArgumentException("Invalid repeated error group");
            }
            serviceName = dimension(serviceName);
            environment = dimension(environment);
            if (representativeUid != null) new Selection(groupKey, representativeUid);
        }
    }

    /** Whole-window evidence or an explicit state without fabricated counts. */
    public record Result(String state, Scope scope, String coverage, Long matchingEvents, List<Group> groups) {
        public Result {
            Objects.requireNonNull(scope);
            if (!List.of("ready", "unsupported", "over_budget", "unavailable").contains(state)) {
                throw new IllegalArgumentException("Invalid repeated error state");
            }
            groups = List.copyOf(groups);
            if ("ready".equals(state)) {
                if (!"window".equals(coverage) || matchingEvents == null || matchingEvents < 0
                        || matchingEvents > ROW_BUDGET || groups.size() > GROUP_LIMIT) {
                    throw new IllegalArgumentException("Invalid repeated error coverage");
                }
                long represented = 0;
                long previous = Long.MAX_VALUE;
                var keys = new java.util.HashSet<String>();
                for (var group : groups) {
                    if (group.count() > previous || group.lastSeen() < scope.start() || group.lastSeen() > scope.end()
                            || !keys.add(group.groupKey())) {
                        throw new IllegalArgumentException("Invalid repeated error ranking");
                    }
                    previous = group.count();
                    represented = Math.addExact(represented, group.count());
                }
                if (represented > matchingEvents) throw new IllegalArgumentException("Contradictory repeated error counts");
            } else if (coverage != null || matchingEvents != null || !groups.isEmpty()) {
                throw new IllegalArgumentException("Unavailable repeated errors contain evidence");
            }
        }
    }

    /** Stable identities for the bounded exact-group drilldown, never plaintext message conditions. */
    public record Record(String uid, long eventTime) {
        public Record {
            if (uid == null || !uid.matches("[A-Za-z0-9][A-Za-z0-9._:-]{0,127}") || eventTime < 0) {
                throw new IllegalArgumentException("Invalid repeated error record");
            }
        }
    }

    /** Read-only drilldown result, with explicit missing identity or unavailable storage. */
    public record Records(String state, Scope scope, Selection selection, List<Record> records) {
        public Records {
            Objects.requireNonNull(scope);
            Objects.requireNonNull(selection);
            records = List.copyOf(records);
            if (!List.of("ready", "missing", "unsupported", "over_budget", "unavailable").contains(state)
                    || records.size() > 20 || (!"ready".equals(state) && !records.isEmpty())) {
                throw new IllegalArgumentException("Invalid repeated error records");
            }
            for (var row : records) {
                if (row.eventTime() < scope.start() || row.eventTime() > scope.end()) {
                    throw new IllegalArgumentException("Repeated error record outside scope");
                }
            }
        }
    }

    public static Result unavailable(String state, Scope scope) {
        return new Result(state, scope, null, null, List.of());
    }

    public static String groupKey(Scope scope, String service, String environment, String message) {
        Objects.requireNonNull(message);
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            for (var value : List.of(scope.workspaceId(), dimension(service), dimension(environment), message)) {
                var bytes = value.getBytes(StandardCharsets.UTF_8);
                digest.update(java.nio.ByteBuffer.allocate(4).putInt(bytes.length).array());
                digest.update(bytes);
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 unavailable", impossible);
        }
    }

    private static String dimension(String value) {
        if (value == null) return "";
        if (value.length() > 256 || value.chars().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException("Invalid repeated error dimension");
        }
        return value;
    }
}
