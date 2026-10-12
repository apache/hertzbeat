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

package org.apache.hertzbeat.collector.runtime.otel;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeConfig;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;

/**
 * Builds source lifecycle entries from semantic configuration revisions.
 */
final class OtelRuntimeSourceStatuses {

    private OtelRuntimeSourceStatuses() {
    }

    static List<ManagedOtelRuntimeStatus.ManagedOtelSourceStatus> build(
            ManagedOtelRuntimeConfig activeConfig,
            ManagedOtelRuntimeConfig desiredConfig,
            long activeRevision,
            long rejectedRevision,
            String rejectedError) {
        Map<SourceKey, Object> active = definitions(activeConfig);
        Map<SourceKey, Object> desired = definitions(desiredConfig);
        List<ManagedOtelRuntimeStatus.ManagedOtelSourceStatus> statuses = new ArrayList<>();
        active.keySet().stream().sorted().forEach(key -> statuses.add(status(
                key, activeRevision, ManagedOtelRuntimeStatus.SourceState.ACTIVE, "")));
        if (desiredConfig == null || desiredConfig.revision() <= activeRevision) {
            return List.copyOf(statuses);
        }
        ManagedOtelRuntimeStatus.SourceState pendingState = rejectedRevision == desiredConfig.revision()
                ? ManagedOtelRuntimeStatus.SourceState.REJECTED
                : ManagedOtelRuntimeStatus.SourceState.DESIRED;
        String error = pendingState == ManagedOtelRuntimeStatus.SourceState.REJECTED
                ? bounded(rejectedError) : "";
        Set<SourceKey> changed = new TreeSet<>();
        changed.addAll(active.keySet());
        changed.addAll(desired.keySet());
        changed.removeIf(key -> Objects.equals(active.get(key), desired.get(key)));
        changed.forEach(key -> statuses.add(status(key, desiredConfig.revision(), pendingState, error)));
        return List.copyOf(statuses);
    }

    private static Map<SourceKey, Object> definitions(ManagedOtelRuntimeConfig config) {
        if (config == null) {
            return Map.of();
        }
        Map<SourceKey, Object> definitions = new HashMap<>();
        if (config.hostMetricsEnabled()) {
            definitions.put(new SourceKey(ManagedOtelRuntimeStatus.SourceType.HOST_METRICS, "host"),
                    List.of(config.hostMetricsInterval(), config.hostMetricsScrapers()));
        }
        config.prometheusTargets().forEach(target -> definitions.put(
                new SourceKey(ManagedOtelRuntimeStatus.SourceType.PROMETHEUS, target.name()), target));
        config.fileLogSources().forEach(source -> definitions.put(
                new SourceKey(ManagedOtelRuntimeStatus.SourceType.FILE_LOG, source.name()), source));
        return definitions;
    }

    private static ManagedOtelRuntimeStatus.ManagedOtelSourceStatus status(
            SourceKey key, long revision, ManagedOtelRuntimeStatus.SourceState state, String error) {
        return new ManagedOtelRuntimeStatus.ManagedOtelSourceStatus(
                key.type(), key.name(), revision, state, error);
    }

    private static String bounded(String error) {
        String value = Objects.requireNonNullElse(error, "");
        return value.length() <= 512 ? value : value.substring(0, 512);
    }

    private record SourceKey(ManagedOtelRuntimeStatus.SourceType type, String name)
            implements Comparable<SourceKey> {

        private static final Comparator<SourceKey> ORDER = Comparator.comparing(SourceKey::type)
                .thenComparing(SourceKey::name);

        @Override
        public int compareTo(SourceKey other) {
            return ORDER.compare(this, other);
        }
    }
}
