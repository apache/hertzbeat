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

package org.apache.hertzbeat.ai.gateway.runtime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.sun.net.httpserver.HttpServer;

import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalActorVerifier;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentTargetToolAuthorizer;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolCallLedgerService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionOrchestrator;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolOutput;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.persistence.AgentToolCallDao;
import org.apache.hertzbeat.ai.gateway.tool.interaction.AgentInteractionInputService;
import org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorToolService;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
import org.apache.hertzbeat.manager.pojo.dto.ParamDefineInfo;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.beans.factory.ObjectProvider;

import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;

/**
 * Real namespace/policy/approval/ledger logic, isolated in-memory DAO/domain adapters and a real
 * loopback HTTP probe.
 */
final class ControlledMonitorTools implements AutoCloseable {
    final Map<Long, MonitorDto> monitors = new LinkedHashMap<>();
    final Map<Long, AgentToolCall> rows = new LinkedHashMap<>();
    final AgentToolCallDao dao = mock(AgentToolCallDao.class);
    final AgentToolRegistry registry = new AgentToolRegistry();
    final MonitorService domain = mock(MonitorService.class);
    final AppService apps = mock(AppService.class);
    final AgentMonitorToolService service;
    final AgentToolCallLedgerService ledger;
    final AgentToolExecutionOrchestrator orchestrator;
    final HttpServer http;
    int effects;
    int probes;
    final java.util.Set<String> existingWebsiteHosts = new java.util.HashSet<>();
    int sequence;
    long nextMonitorId = 1;
    static final AgentActor USER =
            AgentActor.builder().type("user").id("owner").roles(List.of("user")).build();
    static final AgentActor ADMIN =
            AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build();

    ControlledMonitorTools() throws Exception {
        http = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        http.createContext(
                "/health",
                exchange -> {
                    byte[] body = "local test endpoint".getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(200, body.length);
                    exchange.getResponseBody().write(body);
                    exchange.close();
                });
        http.start();
        when(dao.save(any()))
                .thenAnswer(
                        inv -> {
                            AgentToolCall row = inv.getArgument(0);
                            if (row.getId() == null) {
                                row.setId((long) rows.size() + 1);
                            }
                            rows.put(row.getId(), row);
                            return row;
                        });
        when(dao.findByApprovalId(anyString())).thenAnswer(inv -> approval(inv.getArgument(0)));
        when(dao.findApprovalForRuntimeResume(anyString()))
                .thenAnswer(inv -> approval(inv.getArgument(0)));
        when(dao.findOwnedApprovalForUpdate(
                        anyString(),
                        anyString(),
                        anyString(),
                        anyString(),
                        anyString(),
                        anyString()))
                .thenAnswer(
                        inv ->
                                "isolated".equals(inv.getArgument(1))
                                                && "web-ui".equals(inv.getArgument(2))
                                                && "user".equals(inv.getArgument(3))
                                                && List.of("owner", "admin")
                                                        .contains(inv.getArgument(4))
                                                && "USER_INPUT".equals(inv.getArgument(5))
                                        ? approval(inv.getArgument(0))
                                        : Optional.empty());
        when(dao.findByRunIdOrderByGmtCreateAsc(anyLong()))
                .thenAnswer(
                        inv ->
                                rows.values().stream()
                                        .filter(row -> row.getRunId().equals(inv.getArgument(0)))
                                        .toList());
        var provider = mock(com.usthe.sureness.provider.SurenessAccountProvider.class);
        for (var actor : List.of(USER, ADMIN)) {
            var account = mock(com.usthe.sureness.provider.SurenessAccount.class);
            when(provider.loadAccount(actor.getId())).thenReturn(account);
            when(account.getOwnRoles()).thenReturn(actor.getRoles());
        }
        ObjectProvider<AgentToolRegistry> registryProvider = mock(ObjectProvider.class);
        when(registryProvider.getObject()).thenReturn(registry);
        ledger =
                new AgentToolCallLedgerService(
                        dao, registryProvider, new AgentApprovalActorVerifier(provider));
        var inputs = mock(AgentInteractionInputService.class);
        when(inputs.validateReference(any())).thenAnswer(inv -> inv.getArgument(0));
        when(inputs.mergeAndTake(any())).thenAnswer(inv -> inv.getArgument(0));
        orchestrator =
                new AgentToolExecutionOrchestrator(
                        registry,
                        new AgentPolicyService(),
                        ledger,
                        inputs,
                        new AgentTargetToolAuthorizer());
        service = new AgentMonitorToolService(domain, apps, mock(CollectorMonitorBindDao.class));
        when(apps.getAppDefine(anyString()))
                .thenReturn(
                        org.apache.hertzbeat.common.entity.job.Job.builder()
                                .metrics(
                                        List.of(
                                                org.apache.hertzbeat.common.entity.job.Metrics
                                                        .builder()
                                                        .protocol("http")
                                                        .build()))
                                .build());
        when(apps.getI18nApps(anyString())).thenReturn(Map.of("website", "WEBSITE"));
        when(apps.getAppParamDefines("website"))
                .thenReturn(
                        List.of(
                                definition("host", "host", true, null),
                                definition("port", "number", true, "80"),
                                definition("ssl", "boolean", true, null),
                                definition("uri", "text", false, null),
                                definition("timeout", "number", false, null)));
        when(domain.getMonitors(
                        any(),
                        any(),
                        any(),
                        any(),
                        any(),
                        any(),
                        org.mockito.ArgumentMatchers.anyInt(),
                        org.mockito.ArgumentMatchers.anyInt(),
                        any()))
                .thenAnswer(
                        inv -> {
                            String search = inv.getArgument(2);
                            var matches =
                                    monitors.values().stream()
                                            .map(dto -> copyMonitor(dto.getMonitor()))
                                            .filter(
                                                    m ->
                                                            search == null
                                                                    || m.getName().contains(search))
                                            .toList();
                            return new org.springframework.data.domain.PageImpl<>(matches);
                        });
        when(domain.getMonitorDto(anyLong()))
                .thenAnswer(inv -> copy(monitors.get(inv.getArgument(0))));
        when(domain.getMonitor(anyLong()))
                .thenAnswer(
                        inv -> {
                            var dto = monitors.get(inv.getArgument(0));
                            return dto == null ? null : copyMonitor(dto.getMonitor());
                        });
        doAnswer(
                        inv -> {
                            Monitor monitor = inv.getArgument(0);
                            monitor.setId(nextMonitorId++);
                            MonitorDto dto = new MonitorDto();
                            dto.setMonitor(monitor);
                            dto.setParams(inv.getArgument(1), false);
                            dto.setCollector(inv.getArgument(2));
                            monitors.put(monitor.getId(), copy(dto));
                            effects++;
                            return null;
                        })
                .when(domain)
                .addMonitor(any(), any(), any(), any());
        doAnswer(
                        inv -> {
                            MonitorDto dto = new MonitorDto();
                            dto.setMonitor(inv.getArgument(0));
                            dto.setParams(inv.getArgument(1), false);
                            dto.setCollector(inv.getArgument(2));
                            monitors.put(dto.getMonitor().getId(), copy(dto));
                            effects++;
                            return null;
                        })
                .when(domain)
                .modifyMonitor(any(), any(), any(), any());
        doAnswer(
                        inv -> {
                            for (Long id : (Set<Long>) inv.getArgument(0)) {
                                Monitor monitor = monitors.get(id).getMonitor();
                                monitor.setStatus((byte) 0);
                                monitors.get(id).setMonitor(monitor);
                                effects++;
                            }
                            return null;
                        })
                .when(domain)
                .cancelManageMonitors(anySet());
        doAnswer(
                        inv -> {
                            for (Long id : (Set<Long>) inv.getArgument(0)) {
                                Monitor monitor = monitors.get(id).getMonitor();
                                monitor.setStatus((byte) 1);
                                monitors.get(id).setMonitor(monitor);
                                effects++;
                            }
                            return null;
                        })
                .when(domain)
                .enableManageMonitors(anySet());
        doAnswer(
                        inv -> {
                            List<Param> params = inv.getArgument(1);
                            Map<String, String> values = new LinkedHashMap<>();
                            params.forEach(
                                    param -> values.put(param.getField(), param.getParamValue()));
                            URI uri =
                                    URI.create(
                                            "http://"
                                                    + values.get("host")
                                                    + ":"
                                                    + values.get("port")
                                                    + values.getOrDefault("uri", "/health"));
                            if (!"127.0.0.1".equals(uri.getHost())
                                    || uri.getPort() != http.getAddress().getPort()) {
                                throw new AssertionError("Probe must remain loopback");
                            }
                            int status =
                                    HttpClient.newHttpClient()
                                            .send(
                                                    HttpRequest.newBuilder(uri).GET().build(),
                                                    HttpResponse.BodyHandlers.discarding())
                                            .statusCode();
                            if (status != 200) {
                                throw new IllegalArgumentException("StatusCode " + status);
                            }
                            probes++;
                            return null;
                        })
                .when(domain)
                .detectMonitor(any(), any(), any());
        register(
                "monitor.query",
                args ->
                        service.queryMonitors(
                                null,
                                (String) args.get("app"),
                                null,
                                (String) args.get("search"),
                                null,
                                "id",
                                "asc",
                                args.get("pageIndex") instanceof Number index
                                        ? index.intValue()
                                        : 0,
                                args.get("pageSize") instanceof Number size ? size.intValue() : 2,
                                false,
                                args.get("purpose") == null
                                        ? org.apache.hertzbeat.ai.gateway.contract.AgentQueryPurpose
                                                .PAGE
                                        : org.apache.hertzbeat.ai.gateway.contract.AgentQueryPurpose
                                                .valueOf(String.valueOf(args.get("purpose")))));
        register("monitor.types", args -> service.listMonitorTypes("en-US"));
        register(
                "monitor.type_params",
                args -> service.getMonitorTypeParams((String) args.get("app")));
        register(
                "monitor.detect_draft",
                args ->
                        service.detectDraft(
                                (String) args.get("app"),
                                parameterStrings(args.get("parameters")),
                                (String) args.get("collector")));
        register(
                "monitor.create",
                args ->
                        service.createMonitor(
                                (String) args.get("name"),
                                (String) args.get("app"),
                                args.get("intervals") instanceof Number n ? n.intValue() : null,
                                (Map<String, Object>) args.get("params"),
                                null,
                                null,
                                null));
        register(
                "monitor.get",
                args -> service.monitorGet(((Number) args.get("monitorId")).longValue()));
        register(
                "monitor.update",
                args ->
                        service.updateMonitor(
                                ((Number) args.get("monitorId")).longValue(),
                                (Map<String, Object>) args.get("updates"),
                                null));
        register("monitor.pause", args -> service.pauseMonitors(ids(args.get("monitorIds"))));
        register("monitor.resume", args -> service.resumeMonitors(ids(args.get("monitorIds"))));
    }

    Map<String, Object> params() {
        return Map.of(
                "host",
                "127.0.0.1",
                "port",
                http.getAddress().getPort(),
                "ssl",
                false,
                "uri",
                "/health");
    }

    Map<String, Object> createArguments() {
        return Map.of("name", "local-site", "app", "website", "intervals", 30, "params", params());
    }

    AgentToolExecutionRequest request(String tool, Map<String, Object> args, AgentActor actor) {
        return AgentToolExecutionRequest.builder()
                .sessionUid("session")
                .runId(2L)
                .runUid("run")
                .runSessionId(1L)
                .workspaceId("isolated")
                .actor(actor)
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .toolName(tool)
                .toolCallId("isolated-" + ++sequence)
                .arguments(args)
                .build();
    }

    AgentToolExecutionResult approved(AgentToolExecutionRequest request) {
        var pending = orchestrator.execute(request);
        if (pending.getStatus() != AgentToolStatus.WAITING_APPROVAL) {
            return pending;
        }
        ledger.decideApproval(
                pending.getApprovalId(),
                envelope(),
                AgentRuntimeEntryType.USER_INPUT,
                AgentApprovalDecision.APPROVED);
        return orchestrator.execute(
                request.toBuilder()
                        .approvalId(pending.getApprovalId())
                        .approvalStatus(AgentApprovalStatus.APPROVED.name())
                        .build());
    }

    GatewayEnvelope envelope() {
        return envelope(USER);
    }

    GatewayEnvelope envelope(AgentActor actor) {
        return GatewayEnvelope.builder()
                .workspaceId("isolated")
                .channelId("web-ui")
                .receivedAt(1L)
                .actor(actor)
                .build();
    }

    private Optional<AgentToolCall> approval(String id) {
        return rows.values().stream().filter(row -> id.equals(row.getApprovalId())).findFirst();
    }

    void enableNativeBulk() {
        var nativeRows =
                new java.util.concurrent.ConcurrentHashMap<
                        String,
                        org.apache.hertzbeat.manager.monitor.batch.WebsiteMonitorBatchItem>();
        var nativeDao =
                mock(org.apache.hertzbeat.manager.monitor.batch.WebsiteMonitorBatchItemDao.class);
        when(nativeDao.findById(anyString()))
                .thenAnswer(inv -> Optional.ofNullable(nativeRows.get(inv.getArgument(0))));
        when(nativeDao.saveAndFlush(any()))
                .thenAnswer(
                        inv -> {
                            org.apache.hertzbeat.manager.monitor.batch.WebsiteMonitorBatchItem row =
                                    inv.getArgument(0);
                            row.setVersion(row.getVersion() == null ? 0L : row.getVersion() + 1);
                            nativeRows.put(row.getId(), row);
                            return row;
                        });
        when(nativeDao.retryProbe(anyString(), anyString(), anyLong()))
                .thenAnswer(
                        inv -> {
                            var row = nativeRows.get(inv.getArgument(0));
                            if (row != null
                                    && "PROBE_FAILED".equals(row.getState())
                                    && row.getInputHash().equals(inv.getArgument(1))
                                    && row.getVersion().equals(inv.getArgument(2))) {
                                row.setState("CLAIMED");
                                row.setVersion(row.getVersion() + 1);
                                return 1;
                            }
                            return 0;
                        });
        var runDao =
                mock(org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentRunDao.class);
        when(runDao.findByRunUid(anyString()))
                .thenAnswer(
                        inv -> {
                            var execution = AgentToolContextSupport.invocation().getRequest();
                            return Optional.of(
                                    org.apache.hertzbeat.common.entity.agent.AgentRun.builder()
                                            .id(execution.getRunId())
                                            .sessionId(execution.getRunSessionId())
                                            .runUid(execution.getRunUid())
                                            .status("RUNNING")
                                            .build());
                        });
        var hostParams = mock(org.apache.hertzbeat.manager.dao.ParamDao.class);
        when(hostParams.findExistingWebsiteHosts(any())).thenAnswer(invocation -> {
            java.util.Collection<String> hosts = invocation.getArgument(0);
            return hosts.stream().filter(existingWebsiteHosts::contains).toList();
        });
        var batch =
                new org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorBatchToolService(
                        new org.apache.hertzbeat.manager.monitor.batch.WebsiteMonitorBatchService(
                                nativeDao, domain, hostParams, 1),
                        runDao);
        try (var context = new org.springframework.context.support.GenericApplicationContext()) {
            context.registerBean(
                    org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorBatchToolService.class,
                    () -> batch);
            context.refresh();
            var extra =
                    new org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration()
                            .agentToolRegistry(context.getDefaultListableBeanFactory());
            for (var descriptor : extra.descriptors()) {
                registry.register(extra.find(descriptor.getName()).orElseThrow());
            }
        }
    }

    void enableWebsiteExclusions() {
        var params = mock(org.apache.hertzbeat.manager.dao.ParamDao.class);
        when(domain.getMonitors(
                        org.mockito.ArgumentMatchers.isNull(),
                        org.mockito.ArgumentMatchers.eq("website"),
                        org.mockito.ArgumentMatchers.isNull(),
                        org.mockito.ArgumentMatchers.isNull(),
                        org.mockito.ArgumentMatchers.eq("id"),
                        org.mockito.ArgumentMatchers.eq("asc"),
                        org.mockito.ArgumentMatchers.anyInt(),
                        org.mockito.ArgumentMatchers.eq(100),
                        org.mockito.ArgumentMatchers.isNull()))
                .thenAnswer(
                        inv -> {
                            var hosts = existingWebsiteHosts.stream().sorted().toList();
                            int index = inv.getArgument(6);
                            var rows =
                                    java.util.stream.IntStream.range(
                                                    index * 100,
                                                    Math.min(hosts.size(), (index + 1) * 100))
                                            .mapToObj(
                                                    n ->
                                                            Monitor.builder()
                                                                    .id((long) n + 10000)
                                                                    .app("website")
                                                                    .build())
                                            .toList();
                            return new org.springframework.data.domain.PageImpl<>(
                                    rows,
                                    org.springframework.data.domain.PageRequest.of(index, 100),
                                    hosts.size());
                        });
        when(params.findWebsiteHostProjection(any()))
                .thenAnswer(
                        inv -> {
                            List<Long> ids = inv.getArgument(0);
                            var hosts = existingWebsiteHosts.stream().sorted().toList();
                            return ids.stream()
                                    .map(id -> new Object[] {id, hosts.get((int) (id - 10000))})
                                    .toList();
                        });
        try (var context = new org.springframework.context.support.GenericApplicationContext()) {
            context.registerBean(
                    org.apache.hertzbeat.ai.gateway.tool.monitor.AgentWebsiteExclusionToolService
                            .class,
                    () ->
                            new org.apache.hertzbeat.ai.gateway.tool.monitor
                                    .AgentWebsiteExclusionToolService(domain, params));
            context.refresh();
            var extra =
                    new org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration()
                            .agentToolRegistry(context.getDefaultListableBeanFactory());
            for (var descriptor : extra.descriptors())
                registry.register(extra.find(descriptor.getName()).orElseThrow());
        }
    }

    void enableDefinitions(
            org.apache.hertzbeat.manager.monitor.definition.MonitorDefinitionService definitions) {
        try (var context = new org.springframework.context.support.GenericApplicationContext()) {
            context.registerBean(
                    org.apache.hertzbeat.ai.gateway.tool.monitor
                            .AgentMonitorDefinitionWriteToolService.class,
                    () ->
                            new org.apache.hertzbeat.ai.gateway.tool.monitor
                                    .AgentMonitorDefinitionWriteToolService(definitions));
            context.refresh();
            var extra =
                    new org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration()
                            .agentToolRegistry(context.getDefaultListableBeanFactory());
            for (var descriptor : extra.descriptors()) {
                registry.register(extra.find(descriptor.getName()).orElseThrow());
            }
        }
    }

    private void register(String name, Function<Map<String, Object>, Object> handler) {
        var method =
                java.util.Arrays.stream(AgentMonitorToolService.class.getMethods())
                        .filter(
                                m ->
                                        m.getAnnotation(Tool.class) != null
                                                && name.equals(m.getAnnotation(Tool.class).name()))
                        .findFirst()
                        .orElseThrow();
        var policy = method.getAnnotation(AgentToolPolicy.class);
        var descriptor =
                AgentToolDescriptor.builder()
                        .name(name)
                        .description(method.getAnnotation(Tool.class).description())
                        .inputSchema("{\"type\":\"object\"}")
                        .namespace("monitor")
                        .risk(policy.risk())
                        .access(policy.access())
                        .exposure(policy.exposure())
                        .build();
        registry.register(
                new AgentToolRegistry.RegisteredTool(
                        descriptor,
                        context ->
                                AgentToolContextSupport.withInvocation(
                                        context,
                                        () ->
                                                AgentToolOutput.builder()
                                                        .status(AgentToolStatus.SUCCEEDED)
                                                        .modelContent(
                                                                JsonUtil.toJson(
                                                                        handler.apply(
                                                                                context.getRequest()
                                                                                        .getArguments())))
                                                        .build())));
    }

    private static Map<String, String> parameterStrings(Object value) {
        Map<String, String> parameters = new LinkedHashMap<>();
        ((Map<?, ?>) value)
                .forEach((key, item) -> parameters.put(String.valueOf(key), String.valueOf(item)));
        return parameters;
    }

    private static List<Long> ids(Object value) {
        return ((List<?>) value).stream().map(v -> ((Number) v).longValue()).toList();
    }

    private static ParamDefineInfo definition(
            String field, String type, boolean required, String defaultValue) {
        var definition = new ParamDefineInfo();
        definition.setField(field);
        definition.setType(type);
        definition.setRequired(required);
        definition.setDefaultValue(defaultValue);
        return definition;
    }

    private static Monitor copyMonitor(Monitor source) {
        return JsonUtil.fromJson(JsonUtil.toJson(source), Monitor.class);
    }

    private static MonitorDto copy(MonitorDto source) {
        if (source == null) {
            return null;
        }
        var copy = new MonitorDto();
        copy.setMonitor(copyMonitor(source.getMonitor()));
        copy.setParams(
                source.getParams().stream()
                        .map(
                                p ->
                                        Param.builder()
                                                .field(p.getField())
                                                .type(p.getType())
                                                .paramValue(p.getParamValue())
                                                .build())
                        .toList(),
                false);
        copy.setCollector(source.getCollector());
        return copy;
    }

    public void close() {
        http.stop(0);
    }
}
