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

package org.apache.hertzbeat.manager.service.entity;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.DateTimeException;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.manager.service.metric.MonitorMetricQueryContract;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** Resolves a monitor metric intent to one workspace-owned entity authority snapshot. */
@Service
public class EntityMonitorMetricTargetCanonicalizer {

    public static final String TARGET_VERSION = "entity-monitor-metric.v1";
    private static final String ACTIVE_BINDING = "active";
    private static final String METRICS_SIGNAL = "metrics";
    private static final String SERVICE_NAME = "service.name";
    private static final String SERVICE_NAMESPACE = "service.namespace";
    private static final String SERVICE_ENVIRONMENT = "deployment.environment.name";

    private final EntityMonitorBindQueryService bindQueryService;
    private final EntityWorkspaceQueryService entityQueryService;
    private final EntityIdentityQueryService identityQueryService;
    private final MonitorService monitorService;
    private final AppService appService;

    public EntityMonitorMetricTargetCanonicalizer(EntityMonitorBindQueryService bindQueryService,
                                                   EntityWorkspaceQueryService entityQueryService,
                                                   EntityIdentityQueryService identityQueryService,
                                                   MonitorService monitorService, AppService appService) {
        this.bindQueryService = bindQueryService;
        this.entityQueryService = entityQueryService;
        this.identityQueryService = identityQueryService;
        this.monitorService = monitorService;
        this.appService = appService;
    }

    public CanonicalTarget canonicalize(String workspaceId, SourceIntent intent) {
        validateSourceIntent(workspaceId, intent);
        EntityMonitorBind binding = exactActiveBinding(intent.monitorId());
        ObserveEntity entity = workspaceEntity(workspaceId, binding.getEntityId());
        List<EntityIdentity> identities = identities(entity.getId());
        ServiceIdentity service = serviceIdentity(identities);
        Monitor monitor = monitor(intent.monitorId());
        CatalogMetric catalogMetric = catalogMetric(monitor, intent.query());
        String version = binding.getGmtUpdate() == null ? null : binding.getGmtUpdate().toString();
        if (!StringUtils.hasText(version)) {
            throw mismatch();
        }
        String hash = authorityHash(binding, entity, identities, monitor, catalogMetric);
        return new CanonicalTarget(TARGET_VERSION, entity.getId(), intent.monitorId(), service,
                new CanonicalSignal(METRICS_SIGNAL, intent.query(), intent.start(), intent.end(), intent.timezone()),
                new Authority(binding.getId(), version, hash));
    }

    private void validateSourceIntent(String workspaceId, SourceIntent intent) {
        if (!StringUtils.hasText(workspaceId) || intent == null || intent.monitorId() == null
                || intent.monitorId() <= 0 || !METRICS_SIGNAL.equals(intent.signalType())
                || !StringUtils.hasText(intent.query())
                || !MonitorMetricQueryContract.isExactWindowAllowed(intent.start(), intent.end())
                || !validMetricKey(intent.query())
                || !validTimezone(intent.timezone())) {
            throw mismatch();
        }
    }

    private boolean validMetricKey(String metricKey) {
        int separator = metricKey.indexOf('.');
        return separator > 0 && separator == metricKey.lastIndexOf('.') && separator < metricKey.length() - 1;
    }

    private boolean validTimezone(String timezone) {
        if (!StringUtils.hasText(timezone)) {
            return false;
        }
        try {
            ZoneId.of(timezone);
            return true;
        } catch (DateTimeException ignored) {
            return false;
        }
    }

    private EntityMonitorBind exactActiveBinding(Long monitorId) {
        List<EntityMonitorBind> bindings;
        try {
            bindings = bindQueryService.findMonitorBindsByMonitorId(monitorId);
        } catch (RuntimeException ignored) {
            throw unavailable();
        }
        if (bindings == null || bindings.size() != 1 || bindings.getFirst() == null
                || !ACTIVE_BINDING.equalsIgnoreCase(bindings.getFirst().getStatus())
                || !Objects.equals(monitorId, bindings.getFirst().getMonitorId())
                || bindings.getFirst().getId() == null || bindings.getFirst().getEntityId() == null) {
            throw mismatch();
        }
        return bindings.getFirst();
    }

    private ObserveEntity workspaceEntity(String workspaceId, Long entityId) {
        ObserveEntity entity;
        try {
            entity = entityQueryService.findEntityById(entityId).orElse(null);
        } catch (RuntimeException ignored) {
            throw unavailable();
        }
        if (entity == null || !Objects.equals(workspaceId, entity.getWorkspaceId())
                || !Objects.equals(entityId, entity.getId())) {
            throw mismatch();
        }
        return entity;
    }

    private List<EntityIdentity> identities(Long entityId) {
        List<EntityIdentity> identities;
        try {
            identities = identityQueryService.findIdentities(entityId);
        } catch (RuntimeException ignored) {
            throw unavailable();
        }
        if (identities == null || identities.isEmpty()
                || identities.stream().anyMatch(identity -> identity == null
                || !Objects.equals(entityId, identity.getEntityId()))) {
            throw mismatch();
        }
        return identities.stream().sorted(Comparator
                .comparing(EntityIdentity::getIdentityKey, Comparator.nullsFirst(String::compareTo))
                .thenComparing(EntityIdentity::getNormalizedValue, Comparator.nullsFirst(String::compareTo))
                .thenComparing(EntityIdentity::getId, Comparator.nullsFirst(Long::compareTo))).toList();
    }

    private ServiceIdentity serviceIdentity(List<EntityIdentity> identities) {
        return new ServiceIdentity(uniqueIdentity(identities, SERVICE_NAME, true),
                uniqueIdentity(identities, SERVICE_NAMESPACE, false),
                uniqueIdentity(identities, SERVICE_ENVIRONMENT, false));
    }

    private String uniqueIdentity(List<EntityIdentity> identities, String key, boolean required) {
        List<String> values = identities.stream()
                .filter(identity -> key.equals(identity.getIdentityKey()))
                .map(EntityIdentity::getIdentityValue)
                .filter(StringUtils::hasText)
                .toList();
        if (values.size() > 1 || required && values.size() != 1) {
            throw mismatch();
        }
        return values.isEmpty() ? null : values.getFirst();
    }

    private Monitor monitor(Long monitorId) {
        Monitor monitor;
        try {
            monitor = monitorService.getMonitor(monitorId);
        } catch (RuntimeException ignored) {
            throw unavailable();
        }
        if (monitor == null || !Objects.equals(monitorId, monitor.getId()) || !StringUtils.hasText(monitor.getApp())) {
            throw mismatch();
        }
        return monitor;
    }

    private CatalogMetric catalogMetric(Monitor monitor, String metricKey) {
        int separator = metricKey.indexOf('.');
        String group = metricKey.substring(0, separator);
        String fieldName = metricKey.substring(separator + 1);
        Job catalog;
        try {
            catalog = sourceDefinition(monitor);
        } catch (RuntimeException ignored) {
            throw unavailable();
        }
        if (catalog == null || catalog.getMetrics() == null) {
            throw mismatch();
        }
        List<Metrics> groups = catalog.getMetrics().stream()
                .filter(Objects::nonNull)
                .filter(metric -> group.equals(metric.getName()))
                .toList();
        if (groups.size() != 1 || !groups.getFirst().isVisible() || groups.getFirst().getFields() == null) {
            throw mismatch();
        }
        List<Metrics.Field> fields = groups.getFirst().getFields().stream()
                .filter(Objects::nonNull)
                .filter(field -> fieldName.equals(field.getField()))
                .toList();
        if (fields.size() != 1 || fields.getFirst().getType() != CommonConstants.TYPE_NUMBER
                || fields.getFirst().isLabel()) {
            throw mismatch();
        }
        List<Metrics.Field> shape = new ArrayList<>(groups.getFirst().getFields());
        shape.sort(Comparator.comparing(Metrics.Field::getField, Comparator.nullsFirst(String::compareTo)));
        return new CatalogMetric(groups.getFirst(), fields.getFirst(), List.copyOf(shape));
    }

    private Job sourceDefinition(Monitor monitor) {
        if (monitor.getType() == CommonConstants.MONITOR_TYPE_PUSH_AUTO_CREATE) {
            return appService.getPushDefine(monitor.getId());
        }
        if (CommonConstants.PROMETHEUS.equalsIgnoreCase(monitor.getApp())) {
            return appService.getAutoGenerateDynamicDefine(monitor.getId());
        }
        return appService.getAppDefine(MonitorMetricQueryContract.definitionSource(monitor));
    }

    private String authorityHash(EntityMonitorBind binding, ObserveEntity entity,
                                 List<EntityIdentity> identities, Monitor monitor, CatalogMetric catalog) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            add(digest, binding.getId(), binding.getStatus(), binding.getEntityId(), binding.getMonitorId(),
                    binding.getGmtUpdate(), entity.getId(), entity.getWorkspaceId(), entity.getType(), entity.getName());
            for (EntityIdentity identity : identities) {
                add(digest, identity.getId(), identity.getIdentityType(), identity.getIdentityKey(),
                        identity.getIdentityValue(), identity.getNormalizedValue(), identity.getPriority(),
                        identity.isPrimaryIdentity());
            }
            add(digest, monitor.getId(), monitor.getApp(), monitor.getScrape(), monitor.getType(),
                    monitor.getInstance(), monitor.getName(), monitor.getGmtUpdate(),
                    catalog.group().getName(), catalog.group().isVisible());
            for (Metrics.Field field : catalog.shape()) {
                add(digest, field.getField(), field.getType(), field.isLabel(), field.getUnit());
            }
            return "sha256:" + HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is required for target authority", exception);
        }
    }

    private void add(MessageDigest digest, Object... values) {
        for (Object value : values) {
            if (value == null) {
                digest.update(ByteBuffer.allocate(Integer.BYTES).putInt(-1).array());
                continue;
            }
            byte[] bytes = String.valueOf(value).getBytes(StandardCharsets.UTF_8);
            digest.update(ByteBuffer.allocate(Integer.BYTES).putInt(bytes.length).array());
            digest.update(bytes);
        }
    }

    private CanonicalizationException mismatch() {
        return new CanonicalizationException(FailureKind.MISMATCH, "Entity monitor metric target does not match");
    }

    private CanonicalizationException unavailable() {
        return new CanonicalizationException(FailureKind.UNAVAILABLE, "Entity monitor metric target is unavailable");
    }

    /** Stable failure categories exposed to the Gateway admission boundary. */
    public enum FailureKind {
        MISMATCH,
        UNAVAILABLE
    }

    /** Cause-free canonicalization failure safe for admission handling. */
    public static final class CanonicalizationException extends RuntimeException {

        private final FailureKind kind;

        private CanonicalizationException(FailureKind kind, String message) {
            super(message);
            this.kind = kind;
        }

        public FailureKind kind() {
            return kind;
        }
    }

    /** Untrusted source intent supplied by a Gateway channel. */
    public record SourceIntent(Long monitorId, String signalType, String query, Long start, Long end,
                               String timezone) {
    }

    /** Complete manager-authoritative target snapshot. */
    public record CanonicalTarget(String version, Long entityId, Long monitorId, ServiceIdentity service,
                                  CanonicalSignal signal, Authority authority) {
    }

    /** Persisted service identity exported from entity identity rows. */
    public record ServiceIdentity(String name, String namespace, String environment) {
    }

    /** Exact signal scope retained by the canonical target. */
    public record CanonicalSignal(String type, String query, Long start, Long end, String timezone) {
    }

    /** Binding authority snapshot used to detect later authority drift. */
    public record Authority(Long bindingId, String version, String hash) {
    }

    private record CatalogMetric(Metrics group, Metrics.Field field, List<Metrics.Field> shape) {
    }
}
