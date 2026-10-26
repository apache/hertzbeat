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

package org.apache.hertzbeat.manager.monitor.collection;

import com.google.gson.Gson;

import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.entity.job.InlineCollectionPermit;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.common.util.SnowFlakeIdGenerator;
import org.apache.hertzbeat.manager.scheduler.CollectJobScheduling;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Clock;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.BooleanSupplier;

/**
 * Fixed main-Collector, single-shot native collection plans. No remote or file execution fallback.
 */
@Service
public class InlineCollectionPlanService {
    private static final long TTL = 300_000;
    private static final int CAPACITY = 128;
    private static final Gson GSON = new Gson();
    private final MonitorService monitors;
    private final AppService apps;
    private final CollectJobScheduling scheduler;
    private final Clock clock;
    private final Map<String, Plan> plans = new LinkedHashMap<>();

    @org.springframework.beans.factory.annotation.Autowired
    public InlineCollectionPlanService(
            MonitorService monitors, AppService apps, CollectJobScheduling scheduler) {
        this(monitors, apps, scheduler, Clock.systemUTC());
    }

    InlineCollectionPlanService(
            MonitorService monitors, AppService apps, CollectJobScheduling scheduler, Clock clock) {
        this.monitors = monitors;
        this.apps = apps;
        this.scheduler = scheduler;
        this.clock = clock;
    }

    /**
     * Identity is a trusted caller scope, never a model-controlled argument. No collection occurs
     * here.
     */
    public synchronized Preview prepare(String ownerScope, long monitorId) {
        if (ownerScope == null || ownerScope.isBlank() || monitorId <= 0) throw unavailable();
        plans.values().removeIf(plan -> clock.millis() >= plan.preview.expiresAt());
        if (plans.size() >= CAPACITY)
            throw new IllegalStateException("Collection preview capacity reached");
        Source source = source(monitorId);
        Job job = source.job().clone();
        if (job.isSd() || job.isPrometheusProxyMode() || job.isCyclic()) throw unavailable();
        if (job.getMetrics() == null || job.getMetrics().size() != 1) throw unavailable();
        var metric = job.getMetrics().getFirst();
        if (!"script".equals(metric.getProtocol())
                || metric.getScript() == null
                || !Objects.equals(metric.getPriority(), (byte) 0)
                || metric.getCalculates() != null && !metric.getCalculates().isEmpty()
                || metric.getFilters() != null && !metric.getFilters().isEmpty()
                || metric.getUnits() != null && !metric.getUnits().isEmpty()) throw unavailable();
        var config = new LinkedHashMap<String, Configmap>();
        for (var param : source.params()) {
            if ((param.getType() != 0 && param.getType() != 1)
                    || param.getField() == null
                    || containsSecret(param.getField() + "=value")
                    || param.getParamValue() == null
                    || config.containsKey(param.getField())) throw unavailable();
            config.put(
                    param.getField(),
                    new Configmap(
                            param.getField(),
                            param.getParamValue().toString().trim(),
                            param.getType()));
        }
        var tree = GSON.toJsonTree(metric);
        CollectUtil.replaceSmilingPlaceholder(tree, config);
        metric = GSON.fromJson(tree, Metrics.class);
        if (!"script".equals(metric.getProtocol()) || metric.getScript() == null)
            throw unavailable();
        var script = metric.getScript();
        if (!"bash".equals(script.getScriptTool())
                || System.getProperty("os.name").startsWith("Windows")
                || script.getScriptPath() != null && !script.getScriptPath().isBlank()
                || script.getScriptCommand() == null
                || script.getScriptCommand().isBlank()
                || script.getScriptCommand().length() > 16_384) throw unavailable();
        String command = script.getScriptCommand().trim();
        if (command.contains("^_^") || command.contains("^o^") || containsSecret(command))
            throw unavailable();
        String directory = script.getWorkDirectory();
        if (directory == null || directory.isBlank()) directory = System.getProperty("user.dir");
        if (!Path.of(directory).isAbsolute() || containsSecret(directory)) throw unavailable();
        directory = Path.of(directory).normalize().toString();
        script.setWorkDirectory(directory);
        script.setScriptCommand(command);
        metric.setInterval(0);
        metric.setCollectTime(0);
        job.setMetrics(List.of(metric));
        job.setConfigmap(List.of());
        job.setCyclic(false);
        job.setMonitorId(monitorId);
        job.setScheduleType("interval");
        job.setCronExpression(null);
        String id = UUID.randomUUID().toString();
        var argv = List.of("bash", "-c", command);
        String account = InlineCollectionPermit.processAccount();
        String os = System.getProperty("os.name");
        var facts =
                Map.of(
                        "monitorId",
                        monitorId,
                        "sourceRevision",
                        source.revision(),
                        "collector",
                        CommonConstants.MAIN_COLLECTOR_NODE,
                        "argv",
                        argv,
                        "directory",
                        directory,
                        "account",
                        account,
                        "os",
                        os,
                        "oneShot",
                        true);
        String hash = fingerprint(facts);
        var preview =
                new Preview(
                        "inline-collection.v1",
                        id,
                        monitorId,
                        source.revision(),
                        hash,
                        CommonConstants.MAIN_COLLECTOR_NODE,
                        os,
                        account,
                        directory,
                        argv,
                        true,
                        clock.millis() + TTL);
        plans.put(id, new Plan(ownerScope, preview, JsonUtil.toJson(job), new AtomicBoolean()));
        return preview;
    }

    public synchronized Preview preview(
            String ownerScope, String planId, String hash, long monitorId) {
        Plan plan = require(ownerScope, planId, hash, monitorId);
        if (!current(plan)) throw unavailable();
        return plan.preview;
    }

    /**
     * Only the approval-backed Gateway handler supplies this guard. The final Collector checks it
     * again.
     */
    public Result execute(
            String ownerScope,
            String planId,
            String hash,
            long monitorId,
            BooleanSupplier approvedAndCurrent) {
        Plan plan;
        synchronized (this) {
            plan = require(ownerScope, planId, hash, monitorId);
            if (!approvedAndCurrent.getAsBoolean()
                    || !current(plan)
                    || !plan.claimed.compareAndSet(false, true)) throw unavailable();
        }
        Job job = JsonUtil.fromJson(plan.jobJson, Job.class);
        job.setId(SnowFlakeIdGenerator.generateId());
        var p = plan.preview;
        var permit =
                new InlineCollectionPermit(
                        p.argv(),
                        p.directory(),
                        p.account(),
                        p.operatingSystem(),
                        p.expiresAt(),
                        clock,
                        () -> approvedAndCurrent.getAsBoolean() && current(plan));
        InlineCollectionPermit.bind(job.getMetrics().getFirst(), permit);
        List<CollectRep.MetricsData> rows = scheduler.collectLocalApprovedJob(job);
        boolean complete =
                permit.started()
                        && rows != null
                        && !rows.isEmpty()
                        && rows.stream().allMatch(row -> row.getCode() == CollectRep.Code.SUCCESS);
        if (rows != null) rows.forEach(CollectRep.MetricsData::close);
        // Raw command output never enters model context or public errors.
        return new Result(p.planId(), p.planHash(), monitorId, permit.started(), complete);
    }

    private synchronized Plan require(String owner, String id, String hash, long monitorId) {
        Plan p = plans.get(id);
        if (p == null
                || !p.ownerScope.equals(owner)
                || !p.preview.planHash().equals(hash)
                || p.preview.monitorId() != monitorId
                || clock.millis() >= p.preview.expiresAt()
                || p.claimed.get()) throw unavailable();
        return p;
    }

    private boolean current(Plan plan) {
        return clock.millis() < plan.preview.expiresAt()
                && Objects.equals(
                        plan.preview.sourceRevision(), source(plan.preview.monitorId()).revision());
    }

    private Source source(long monitorId) {
        var dto = monitors.getMonitorDto(monitorId);
        if (dto == null
                || dto.getMonitor() == null
                || !Objects.equals(dto.getMonitor().getId(), monitorId)
                || !Objects.equals(dto.getMonitor().getStatus(), (byte) 0)
                || dto.getMonitor().getScrape() != null
                || dto.getCollector() != null
                        && !CommonConstants.MAIN_COLLECTOR_NODE.equals(dto.getCollector()))
            throw unavailable();
        Job definition = apps.getAppDefine(dto.getMonitor().getApp());
        var params =
                dto.getParams() == null
                        ? List.<org.apache.hertzbeat.common.entity.manager.Param>of()
                        : List.copyOf(dto.getParams());
        return new Source(
                definition,
                params,
                fingerprint(
                        Map.of(
                                "monitor",
                                dto.getMonitor(),
                                "params",
                                params,
                                "definition",
                                definition,
                                "collector",
                                CommonConstants.MAIN_COLLECTOR_NODE)));
    }

    private static boolean containsSecret(String value) {
        return value.matches(
                        "(?is).*(password|passwd|authorization|api[_-]?key|private[_-]?key|bearer|secret|token)\\s*[=:].*")
                || value.matches("(?is).*://[^/\\s]*@.*")
                || value.contains("PRIVATE KEY");
    }

    private static String fingerprint(Object value) {
        try {
            Object json = JsonUtil.fromJson(JsonUtil.toJson(value), Object.class);
            return HexFormat.of()
                    .formatHex(
                            MessageDigest.getInstance("SHA-256")
                                    .digest(
                                            JsonUtil.toJson(sorted(json))
                                                    .getBytes(StandardCharsets.UTF_8)));
        } catch (Exception invalid) {
            throw unavailable();
        }
    }

    private static Object sorted(Object value) {
        if (value instanceof Map<?, ?> map) {
            var result = new TreeMap<String, Object>();
            map.forEach((k, v) -> result.put(String.valueOf(k), sorted(v)));
            return result;
        }
        if (value instanceof List<?> list)
            return list.stream().map(InlineCollectionPlanService::sorted).toList();
        return value;
    }

    private static IllegalStateException unavailable() {
        return new IllegalStateException(
                "Collection preview is unavailable, changed, expired or unsupported");
    }

    private record Source(
            Job job,
            List<org.apache.hertzbeat.common.entity.manager.Param> params,
            String revision) {}

    private record Plan(
            String ownerScope, Preview preview, String jobJson, AtomicBoolean claimed) {}

    /** Owner-only immutable display of the exact local one-time invocation. */
    public record Preview(
            String version,
            String planId,
            long monitorId,
            String sourceRevision,
            String planHash,
            String collector,
            String operatingSystem,
            String account,
            String directory,
            List<String> argv,
            boolean oneShot,
            long expiresAt) {
        public Preview {
            argv = List.copyOf(argv);
        }

        @Override
        public String toString() {
            return "InlineCollectionPreview[" + planId + "]";
        }
    }

    /** Bounded receipt; intentionally contains no raw collector output. */
    public record Result(
            String planId, String planHash, long monitorId, boolean started, boolean verified) {}
}
