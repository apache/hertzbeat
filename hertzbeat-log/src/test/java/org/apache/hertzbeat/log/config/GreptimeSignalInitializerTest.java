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

package org.apache.hertzbeat.log.config;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.mockito.InOrder;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

@ExtendWith(MockitoExtension.class)
class GreptimeSignalInitializerTest {

    @Mock
    private GreptimeSqlQueryExecutor sqlQueryExecutor;

    @Mock
    private RestTemplate restTemplate;

    private GreptimeSignalInitializer initializer;

    @BeforeEach
    void setUp() {
        initializer = new GreptimeSignalInitializer(
                new GreptimeProperties(true, "127.0.0.1:4001", "http://127.0.0.1:4000",
                        "public", "greptime", "secret"),
                sqlQueryExecutor,
                restTemplate);
    }

    @Test
    void shouldPrepareTraceSchemaPipelineAndReadiness() {
        when(sqlQueryExecutor.execute(anyString())).thenAnswer(invocation ->
                invocation.getArgument(0, String.class).startsWith("SELECT 1")
                        ? List.of(Map.of("ready", 1)) : List.of());
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok("ok"));

        initializer.initialize();

        InOrder sqlOrder = org.mockito.Mockito.inOrder(sqlQueryExecutor);
        sqlOrder.verify(sqlQueryExecutor).execute(org.mockito.ArgumentMatchers.startsWith("CREATE TABLE IF NOT EXISTS hzb_traces"));
        sqlOrder.verify(sqlQueryExecutor).execute(org.mockito.ArgumentMatchers.startsWith(
                "ALTER TABLE hzb_traces ADD COLUMN IF NOT EXISTS \"resource_attributes.service.namespace\""));
        sqlOrder.verify(sqlQueryExecutor).execute(org.mockito.ArgumentMatchers.startsWith(
                "ALTER TABLE hzb_traces ADD COLUMN IF NOT EXISTS \"resource_attributes.deployment.environment.name\""));
        sqlOrder.verify(sqlQueryExecutor).execute("SELECT 1 AS ready");
        verify(restTemplate).exchange(eq("http://127.0.0.1:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class));
    }

    @Test
    void shouldFailStartupWhenGreptimeIsUnavailable() {
        when(sqlQueryExecutor.execute(anyString())).thenThrow(new IllegalStateException("offline"));

        assertThatThrownBy(initializer::initialize)
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("GreptimeDB is required for the three-signal release but initialization failed")
                .hasCauseInstanceOf(IllegalStateException.class);
    }
}
