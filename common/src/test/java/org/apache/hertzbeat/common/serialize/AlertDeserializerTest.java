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

import static org.junit.jupiter.api.Assertions.assertEquals;
import java.util.Map;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.kafka.common.header.Headers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * test case for {@link AlertDeserializer}
 */

class AlertDeserializerTest {

    private AlertDeserializer alertDeserializer;

    @Mock
    private Map<String, ?> configs;

    @Mock
    private Headers headers;

    @BeforeEach
    void setUp() {

        MockitoAnnotations.openMocks(this);

        alertDeserializer = new AlertDeserializer();
    }

    @Test
    void testConfigure() {

        alertDeserializer.configure(configs, false);
    }

    @Test
    void testDeserializeWithBytes() {

        String json = "{\"target\":\"test\",\"content\":\"test\"}";
        byte[] bytes = json.getBytes();
        Alert expectedAlert = Alert.builder()
                .content("test")
                .target("test")
                .build();

        Alert actualAlert = alertDeserializer.deserialize("", bytes);

        assertEquals(expectedAlert.getContent(), actualAlert.getContent());
        assertEquals(expectedAlert.getTarget(), actualAlert.getTarget());
    }

    @Test
    void testDeserializeWithHeaders() {

        String topic = "alerts";
        byte[] data = "{\"target\":\"test\",\"content\":\"test\"}".getBytes();

        Alert expectedAlert = Alert.builder()
                .content("test")
                .target("test")
                .build();

        Alert actualAlert = alertDeserializer.deserialize(topic, headers, data);

        assertEquals(expectedAlert.getContent(), actualAlert.getContent());
        assertEquals(expectedAlert.getTarget(), actualAlert.getTarget());
    }

    @Test
    void testClose() {

        alertDeserializer.close();
    }

}
