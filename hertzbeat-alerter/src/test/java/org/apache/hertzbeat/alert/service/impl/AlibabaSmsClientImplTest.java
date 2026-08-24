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

package org.apache.hertzbeat.alert.service.impl;

import java.util.Map;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import tools.jackson.core.type.TypeReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Test case for {@link AlibabaSmsClientImpl}: Aliyun rejects a template variable
 * whose value is null or blank, so the built param JSON must never contain one.
 */
class AlibabaSmsClientImplTest {

    private final AlibabaSmsClientImpl client = new AlibabaSmsClientImpl(null);

    private Map<String, String> params(GroupAlert alert) {
        return JsonUtil.fromJson(client.buildTemplateParam(alert), new TypeReference<>() { });
    }

    @Test
    void testAlertShapedLikeSendTestMsgHasNoNullVariables() {
        GroupAlert alert = GroupAlert.builder()
                .commonLabels(Map.of("alertname", "CPU Usage Alert"))
                .commonAnnotations(Map.of("suggest", "Please check the CPU usage of the server"))
                .build();

        Map<String, String> params = params(alert);
        assertEquals(3, params.size());
        params.forEach((k, v) -> assertFalse(v == null || v.isBlank(), k + " must not be null/blank"));
        assertEquals("unknown", params.get("instance"));
    }

    @Test
    void alertWithoutLabelsAndAnnotationsHasNoNullVariables() {
        Map<String, String> params = params(GroupAlert.builder().build());
        params.forEach((k, v) -> assertFalse(v == null || v.isBlank(), k + " must not be null/blank"));
    }

    @Test
    void realAlertValuesPassThrough() {
        GroupAlert alert = GroupAlert.builder()
                .commonLabels(Map.of("instance", "192.168.1.10:3306", "priority", "critical"))
                .commonAnnotations(Map.of("summary", "mysql down"))
                .build();

        Map<String, String> params = params(alert);
        assertEquals("192.168.1.10:3306", params.get("instance"));
        assertEquals("critical", params.get("priority"));
        assertEquals("mysql down", params.get("content"));
        assertTrue(params.values().stream().noneMatch(String::isBlank));
    }
}
