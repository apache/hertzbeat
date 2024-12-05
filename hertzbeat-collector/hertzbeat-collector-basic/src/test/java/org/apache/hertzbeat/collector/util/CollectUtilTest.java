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

package org.apache.hertzbeat.collector.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.gson.Gson;
import com.google.gson.JsonElement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * Test case for {@link CollectUtil}
 */
class CollectUtilTest {

    private static final ObjectMapper JSON_MAPPER = new ObjectMapper();

    @Test
    void countMatchKeyword() {
        int keyword = CollectUtil.countMatchKeyword("hertzbeat", "e");
        assertEquals(2, keyword);
        int i = CollectUtil.countMatchKeyword("查询id183", "\\d");
        assertEquals(3, i);
        assertEquals(0, CollectUtil.countMatchKeyword(null, null));
    }

    @Test
    void getTimeout() {
        int timeout1 = CollectUtil.getTimeout("4000");
        assertEquals(4000, timeout1);
        int timeout2 = CollectUtil.getTimeout("4000.5");
        assertEquals(4000, timeout2);
        int timeout3 = CollectUtil.getTimeout("a4000.5");
        assertEquals(60000, timeout3);
        int timeout4 = CollectUtil.getTimeout(null);
        assertEquals(60000, timeout4);
    }

    @Test
    void extractDoubleAndUnitFromStr() {
        CollectUtil.DoubleAndUnit res1 = CollectUtil.extractDoubleAndUnitFromStr("20.5%");
        assertNotNull(res1);
        assertEquals(20.5, res1.getValue());
        assertEquals("%", res1.getUnit());

        CollectUtil.DoubleAndUnit res2 = CollectUtil.extractDoubleAndUnitFromStr("");
        assertNull(res2);

        CollectUtil.DoubleAndUnit res3 = CollectUtil.extractDoubleAndUnitFromStr("KB");
        assertNotNull(res3);
        assertEquals(0, res3.getValue());
        assertEquals("KB", res3.getUnit());

        CollectUtil.DoubleAndUnit res4 = CollectUtil.extractDoubleAndUnitFromStr("GRAPH0");
        assertNull(res4.getValue());
        assertNull(res4.getUnit());

        CollectUtil.DoubleAndUnit res5 = CollectUtil.extractDoubleAndUnitFromStr("200Ki");
        assertEquals(200, res5.getValue());
        assertEquals("Ki", res5.getUnit());
        CollectUtil.DoubleAndUnit res6 = CollectUtil.extractDoubleAndUnitFromStr("200Mi");
        assertEquals(200, res6.getValue());
        assertEquals("Mi", res6.getUnit());
        CollectUtil.DoubleAndUnit res7 = CollectUtil.extractDoubleAndUnitFromStr("200Gi");
        assertEquals(200, res7.getValue());
        assertEquals("Gi", res7.getUnit());
    }


    @Test
    void assertPromRequireField() {
        assertEquals(true, CollectUtil.assertPromRequireField("timestamp"));
        assertEquals(true, CollectUtil.assertPromRequireField("value"));
        assertEquals(false, CollectUtil.assertPromRequireField("timestamp_value"));
    }

    @Test
    void containCryPlaceholder() {
        Metrics metrics = Metrics.builder().name("^o^name^o^").build();
        JsonElement jsonElement = new Gson().toJsonTree(metrics);
        assertTrue(CollectUtil.containCryPlaceholder(jsonElement));
    }

    @Test
    void replaceCryPlaceholder() throws JsonMappingException, JsonProcessingException {
        Metrics metrics = Metrics.builder().name("^o^name^o^").build();
        JsonElement jsonElement = new Gson().toJsonTree(metrics);
        Map<String, Configmap> configmap = new HashMap<>();
        Configmap config = Configmap.builder().key("name").value("张三").build();
        configmap.put("name", config);
        JsonElement res1 = CollectUtil.replaceCryPlaceholder(jsonElement, configmap);

        Metrics metricsTarget = Metrics.builder().name("张三").build();
        JsonElement jsonElementTarget = new Gson().toJsonTree(metricsTarget);
        assertEquals(JSON_MAPPER.readTree(jsonElementTarget.toString()), JSON_MAPPER.readTree(res1.toString()));

        List<Metrics> metricsList = new ArrayList<>();
        metricsList.add(metrics);
        metricsList.add(metrics);
        JsonElement jsonArray = new Gson().toJsonTree(metricsList);
        JsonElement res2 = CollectUtil.replaceCryPlaceholder(jsonArray, configmap);

        List<Metrics> metricsListTarget = new ArrayList<>();
        metricsListTarget.add(metricsTarget);
        metricsListTarget.add(metricsTarget);
        JsonElement jsonArrayTarget = new Gson().toJsonTree(metricsListTarget);
        assertEquals(JSON_MAPPER.readTree(jsonArrayTarget.toString()), JSON_MAPPER.readTree(res2.toString()));
    }

    static Stream<Arguments> testParamsForShouldVerifyReplaceCryPlaceholder() {
        JsonObject jsonObject = new JsonObject();
        String value = "^o^A1-B2.C3^o^";
        String replacedField = "A1-B2.C3";
        String replacedValue = "A1B2C3";
        String nameKey = "name";
        String messageKey = "message";

        jsonObject.add(messageKey, new JsonPrimitive(value));
        Map<String, Configmap> configmap = new HashMap<>();
        Configmap config = Configmap.builder().key(nameKey).value(replacedValue).build();
        configmap.put(replacedField, config);

        JsonObject jsonObjectExpected = new JsonObject();
        jsonObjectExpected.addProperty(messageKey, replacedValue);

        Map<String, Configmap> configmapUnmatched = new HashMap<>();
        Configmap configUnmatched = Configmap.builder().key(nameKey).value(replacedValue).build();
        configmapUnmatched.put(nameKey, configUnmatched);

        JsonObject jsonObjectExpectedForUnmatched = new JsonObject();
        jsonObjectExpectedForUnmatched.addProperty(messageKey, value);

        Map<String, Configmap> configMapSameLength = new HashMap<>();
        Configmap configSameLength = Configmap.builder().key(nameKey).value(null).build();
        configMapSameLength.put(replacedField, configSameLength);

        JsonObject jsonObjectExpectedForSameLength = new JsonObject();
        jsonObjectExpectedForSameLength.addProperty(messageKey, (String) null);

        return Stream.of(
                Arguments.of(jsonObject.deepCopy(), configMapSameLength, jsonObjectExpectedForSameLength),
                Arguments.of(jsonObject.deepCopy(), configmap, jsonObjectExpected),
                Arguments.of(jsonObject.deepCopy(), configmapUnmatched, jsonObjectExpectedForUnmatched)
        );
    }

    @ParameterizedTest
    @MethodSource("testParamsForShouldVerifyReplaceCryPlaceholder")
    void shouldVerifyReplaceCryPlaceholder(JsonObject jsonObject,
                                           Map<String, Configmap> configmap,
                                           JsonObject jsonObjectTarget) throws JsonProcessingException {

        JsonElement res1 = CollectUtil.replaceCryPlaceholder(jsonObject, configmap);
        assertEquals(JSON_MAPPER.readTree(jsonObjectTarget.toString()), JSON_MAPPER.readTree(res1.toString()));

        List<JsonObject> metricsList = new ArrayList<>();
        metricsList.add(jsonObject);
        JsonElement jsonArray = new Gson().toJsonTree(metricsList);
        JsonElement res2 = CollectUtil.replaceCryPlaceholder(jsonArray, configmap);

        List<JsonObject> metricsListTarget = new ArrayList<>();

        metricsListTarget.add(jsonObjectTarget);
        JsonElement jsonArrayTarget = new Gson().toJsonTree(metricsListTarget);
        assertEquals(JSON_MAPPER.readTree(jsonArrayTarget.toString()), JSON_MAPPER.readTree(res2.toString()));
    }

    @Test
    void replaceSmilingPlaceholder() throws JsonMappingException, JsonProcessingException {
        Metrics metrics = Metrics.builder().name("^_^name^_^").build();
        JsonElement jsonElement = new Gson().toJsonTree(metrics);
        HashMap<String, Configmap> configmap = new HashMap<>();
        Configmap config = Configmap.builder().key("name").value("张三").build();
        configmap.put("name", config);
        JsonElement res = CollectUtil.replaceSmilingPlaceholder(jsonElement, configmap);
        Metrics metricsTarget = Metrics.builder().name("张三").build();
        JsonElement jsonElement2 = new Gson().toJsonTree(metricsTarget);
        assertEquals(JSON_MAPPER.readTree(jsonElement2.toString()), JSON_MAPPER.readTree(res.toString()));

        List<Metrics> metricsList = new ArrayList<>();
        metricsList.add(metrics);
        metricsList.add(metrics);
        JsonElement jsonArray = new Gson().toJsonTree(metricsList);
        JsonElement res2 = CollectUtil.replaceSmilingPlaceholder(jsonArray, configmap);

        List<Metrics> metricsListTarget = new ArrayList<>();
        metricsListTarget.add(metricsTarget);
        metricsListTarget.add(metricsTarget);
        JsonElement jsonArrayTarget = new Gson().toJsonTree(metricsListTarget);
        assertEquals(JSON_MAPPER.readTree(jsonArrayTarget.toString()), JSON_MAPPER.readTree(res2.toString()));
    }

    @Test
    void replaceUriSpecialChar() {
        assertEquals("google.com%20", CollectUtil.replaceUriSpecialChar("google.com "));
    }
}
