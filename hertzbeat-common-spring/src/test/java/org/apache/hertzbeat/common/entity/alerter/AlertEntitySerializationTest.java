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

package org.apache.hertzbeat.common.entity.alerter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

class AlertEntitySerializationTest {

    @Test
    void shouldOmitNullMapEntriesFromAlertApiPayloads() {
        Map<String, String> labels = new HashMap<>();
        labels.put("alertname", "CollectorUnavailable");
        labels.put("collectorVersion", null);
        SingleAlert singleAlert = SingleAlert.builder()
                .labels(labels)
                .annotations(new HashMap<>(labels))
                .build();
        GroupAlert groupAlert = GroupAlert.builder()
                .groupLabels(new HashMap<>(labels))
                .commonLabels(new HashMap<>(labels))
                .commonAnnotations(new HashMap<>(labels))
                .alerts(List.of(singleAlert))
                .build();

        JsonNode payload = JsonUtil.fromJson(JsonUtil.toJson(groupAlert));

        assertStringMapWithoutNullEntry(payload.path("groupLabels"));
        assertStringMapWithoutNullEntry(payload.path("commonLabels"));
        assertStringMapWithoutNullEntry(payload.path("commonAnnotations"));
        assertStringMapWithoutNullEntry(payload.path("alerts").path(0).path("labels"));
        assertStringMapWithoutNullEntry(payload.path("alerts").path(0).path("annotations"));
    }

    @Test
    void shouldNeverExposePersistedWorkspaceInAlertPayloads() throws Exception {
        SingleAlert singleAlert = SingleAlert.builder().build();
        GroupAlert groupAlert = GroupAlert.builder().alerts(List.of(singleAlert)).build();
        setWorkspace(singleAlert, "team-a");
        setWorkspace(groupAlert, "team-a");

        JsonNode payload = JsonUtil.fromJson(JsonUtil.toJson(groupAlert));

        assertFalse(payload.has("workspaceId"));
        assertFalse(payload.path("alerts").path(0).has("workspaceId"));
    }

    @Test
    void clonePreservesInternalWorkspaceWithoutExposingIt() {
        SingleAlert alert = SingleAlert.builder().workspaceId("team-a").build();

        SingleAlert clone = alert.clone();

        assertEquals("team-a", clone.getWorkspaceId());
        assertFalse(JsonUtil.fromJson(JsonUtil.toJson(clone)).has("workspaceId"));
    }

    private void setWorkspace(Object alert, String workspaceId) throws Exception {
        var field = alert.getClass().getDeclaredField("workspaceId");
        field.setAccessible(true);
        field.set(alert, workspaceId);
    }

    private void assertStringMapWithoutNullEntry(JsonNode map) {
        assertEquals("CollectorUnavailable", map.path("alertname").textValue());
        assertFalse(map.has("collectorVersion"));
    }
}
