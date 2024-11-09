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

package org.apache.hertzbeat.common.serialize;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import java.util.Arrays;
import java.util.Map;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.kafka.common.header.Headers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * test case for {@link AlertSerializer}
 */

class AlertSerializerTest {

    private AlertSerializer alertSerializer;

    @Mock
    private Map<String, ?> configs;

    @Mock
    private Headers headers;

    @BeforeEach
    void setUp() {

        MockitoAnnotations.openMocks(this);
        alertSerializer = new AlertSerializer();
    }

    @Test
    void testConfigure() {

        alertSerializer.configure(configs, false);
    }

    @Test
    void testSerializeWithAlert() {

        Alert alert = Alert.builder()
                .content("test")
                .target("test")
                .build();
        byte[] expectedJson = ("{\"id\":null,\"target\":\"test\",\"alertDefineId\":null,\"priority\":0,\"content\":"
                + "\"test\",\"status\":0,\"times\":null,\"firstAlarmTime\":null,\"lastAlarmTime\":null,\"triggerTimes"
                + "\":null,\"tags\":null,\"creator\":null,\"modifier\":null,\"gmtCreate\":null,\"gmtUpdate\":null}").getBytes();

        byte[] bytes = alertSerializer.serialize("", alert);

        assertNotNull(bytes);
        assertEquals(Arrays.toString(expectedJson), Arrays.toString(bytes));
    }

    @Test
    void testSerializeWithNullAlert() {

        byte[] bytes = alertSerializer.serialize("", null);
        assertNull(bytes);
    }

    @Test
    void testSerializeWithHeaders() {

        Alert alert = Alert.builder()
                .content("test")
                .target("test")
                .build();
        byte[] expectedBytes = ("{\"id\":null,\"target\":\"test\",\"alertDefineId\":null,\"priority\":0,\"content\":"
                + "\"test\",\"status\":0,\"times\":null,\"firstAlarmTime\":null,\"lastAlarmTime\":null,\"triggerTimes"
                + "\":null,\"tags\":null,\"creator\":null,\"modifier\":null,\"gmtCreate\":null,\"gmtUpdate\":null}").getBytes();

        byte[] bytes = alertSerializer.serialize("alerts", headers, alert);

        assertArrayEquals(expectedBytes, bytes);
    }

    @Test
    void testClose() {

        alertSerializer.close();
    }

}
