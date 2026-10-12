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

package org.apache.hertzbeat.collector.dispatch;

import com.google.gson.JsonParser;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.collector.collect.http.HttpCollectImpl;
import org.apache.hertzbeat.collector.dispatch.entrance.internal.CollectJobService;
import org.apache.hertzbeat.collector.timer.TimerDispatch;
import org.apache.hertzbeat.collector.timer.WheelTimerTask;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.HttpProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.common.timer.Timeout;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Verifies UUID lifecycle and payloads actually sent by the HTTP collector.
 */
class DynamicUuidCollectionTest {

    private static final String PAYLOAD = "{\"requestId\":\"{{v4uuid}}\",\"nestedId\":\"{{v4uuid}}\"}";
    private final List<String> requestBodies = new CopyOnWriteArrayList<>();
    private final List<MetricsCollect> tasks = new ArrayList<>();
    private HttpServer server;
    private CommonDispatcher dispatcher;
    private Job job;
    private Timeout timeout;

    @BeforeEach
    void setUp() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/capture", exchange -> {
            try (exchange) {
                requestBodies.add(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
                byte[] body = "ok".getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(200, body.length);
                exchange.getResponseBody().write(body);
            }
        });
        server.start();
        MetricsCollectorQueue queue = mock(MetricsCollectorQueue.class);
        doAnswer(invocation -> {
            tasks.add(invocation.getArgument(0));
            return null;
        }).when(queue).addJob(any(MetricsCollect.class));
        CollectJobService jobService = mock(CollectJobService.class);
        when(jobService.getCollectorIdentity()).thenReturn("uuid-test");
        dispatcher = new CommonDispatcher(queue, mock(TimerDispatch.class), mock(CommonDataQueue.class),
                mock(WorkerPool.class), jobService, List.of()) {
            @Override
            public void start() {
                // Drive scheduling explicitly instead of starting worker and timeout threads.
            }
        };
        job = Job.builder().id(1L).monitorId(1L).tenantId(0L).app("uuid-test").isCyclic(true)
                .defaultInterval(30).labels(Map.of()).annotations(Map.of()).metadata(Map.of())
                .configmap(List.of(Configmap.builder().key("payload").value(PAYLOAD).build()))
                .metrics(List.of(metric("auth", (byte) 0, "^_^payload^_^"),
                        metric("data", (byte) 1, "{\"requestId\":\"{{v4uuid}}\",\"token\":\"^o^token^o^\"}")))
                .build();
        WheelTimerTask timerTask = new WheelTimerTask(job, dispatcher);
        timeout = mock(Timeout.class);
        when(timeout.task()).thenReturn(timerTask);
    }

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void httpRequestsShareUuidAcrossPrioritiesAndRefreshOnTheNextCycle() {
        collectCycle();
        String firstUuid = requestId(requestBodies.get(0));
        assertEquals(4, UUID.fromString(firstUuid).version());
        assertEquals(2, UUID.fromString(firstUuid).variant());
        assertEquals(firstUuid, requestId(requestBodies.get(1)));
        assertEquals(firstUuid, JsonParser.parseString(requestBodies.get(0)).getAsJsonObject().get("nestedId").getAsString());
        assertEquals("access-token", JsonParser.parseString(requestBodies.get(1)).getAsJsonObject().get("token").getAsString());
        assertEquals(PAYLOAD, job.getMetrics().getFirst().getHttp().getPayload());

        job.getMetrics().forEach(metric -> metric.setCollectTime(0L));
        collectCycle();
        String secondUuid = requestId(requestBodies.get(2));
        assertNotEquals(firstUuid, secondUuid);
        assertEquals(secondUuid, requestId(requestBodies.get(3)));
        assertEquals(4, UUID.fromString(secondUuid).version());
    }

    @Test
    void laterHttpMetricsCanUseUuidWithoutDependingOnPreviousResponseFields() {
        job.getMetrics().get(1).getHttp().setPayload(PAYLOAD);
        collectCycle();
        assertEquals(requestId(requestBodies.get(0)), requestId(requestBodies.get(1)));
    }

    @Test
    void payloadCopyPreservesSubtaskCountersAndOriginalTemplate() {
        Metrics source = metric("subtask", (byte) 1, PAYLOAD);
        AtomicInteger counter = new AtomicInteger(2);
        AtomicReference<CollectRep.MetricsData.Builder> response = new AtomicReference<>();
        source.setSubTaskNum(counter);
        source.setSubTaskDataRef(response);
        source.setSubTaskId(1);
        String uuid = UUID.randomUUID().toString();

        Metrics resolved = CollectUtil.replaceUuidInHttpPayload(source, uuid);

        assertEquals(uuid, requestId(resolved.getHttp().getPayload()));
        assertSame(counter, resolved.getSubTaskNum());
        assertSame(response, resolved.getSubTaskDataRef());
        assertEquals(1, resolved.getSubTaskId());
        assertEquals(PAYLOAD, source.getHttp().getPayload());
        assertEquals(source, resolved, "Task identity must still match the scheduled template");
    }

    @Test
    void normalPayloadsAndNonHttpMetricsRemainUnchanged() {
        Metrics normal = metric("normal", (byte) 0, "{\"id\":\"{{unknown}}\"}");
        Metrics nonHttp = Metrics.builder().name("{{v4uuid}}").build();
        String uuid = UUID.randomUUID().toString();
        assertSame(normal, CollectUtil.replaceUuidInHttpPayload(normal, uuid));
        assertSame(nonHttp, CollectUtil.replaceUuidInHttpPayload(nonHttp, uuid));
        assertSame(normal, CollectUtil.replaceUuidInHttpPayload(normal, null));
    }

    @Test
    void collectionUuidIsCollectorLocalAndExcludedFromJobSerialization() {
        job.constructPriorMetrics();
        String uuid = job.getCollectionUuid();
        assertEquals(4, UUID.fromString(uuid).version());
        String serialized = JsonUtil.toJson(job);
        assertFalse(serialized.contains("collectionUuid"));
        assertFalse(serialized.contains(uuid));
        assertNull(job.clone().getCollectionUuid());
    }

    private void collectCycle() {
        int offset = tasks.size();
        dispatcher.dispatchMetricsTask(timeout);
        Metrics first = tasks.get(offset).getMetrics();
        sendHttp(first);
        CollectRep.MetricsData authResponse = CollectRep.MetricsData.newBuilder().setMetrics("auth")
                .setPriority(0).setCode(CollectRep.Code.SUCCESS)
                .addField(CollectRep.Field.newBuilder().setName("token").setType(CommonConstants.TYPE_STRING).build())
                .addValueRow(CollectRep.ValueRow.newBuilder().addColumn("access-token").build()).build();
        try {
            dispatcher.dispatchCollectData(timeout, first, authResponse);
        } finally {
            authResponse.close();
        }
        Metrics later = tasks.get(offset + 1).getMetrics();
        sendHttp(later);
        CollectRep.MetricsData laterResponse = CollectRep.MetricsData.newBuilder().setMetrics("data")
                .setPriority(1).setCode(CollectRep.Code.SUCCESS).build();
        try {
            dispatcher.dispatchCollectData(timeout, later, laterResponse);
        } finally {
            laterResponse.close();
        }
    }

    private void sendHttp(Metrics metrics) {
        CollectRep.MetricsData.Builder response = CollectRep.MetricsData.newBuilder();
        new HttpCollectImpl().collect(response, metrics);
        assertEquals(CollectRep.Code.SUCCESS, response.getCode(), response.getMsg());
        response.build().close();
    }

    private Metrics metric(String name, byte priority, String payload) {
        HttpProtocol http = HttpProtocol.builder().host("127.0.0.1").port(String.valueOf(server.getAddress().getPort()))
                .ssl("false").url("/capture").method("POST").headers(Map.of("Content-Type", "application/json"))
                .payload(payload).parseType(DispatchConstants.PARSE_WEBSITE).build();
        return Metrics.builder().name(name).priority(priority).protocol(DispatchConstants.PROTOCOL_HTTP)
                .aliasFields(List.of("responseTime")).http(http).build();
    }

    private String requestId(String body) {
        return JsonParser.parseString(body).getAsJsonObject().get("requestId").getAsString();
    }
}
