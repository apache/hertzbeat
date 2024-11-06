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

package org.apache.hertzbeat.collector.collect.mqtt;

import com.hivemq.client.mqtt.MqttVersion;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.MqttProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Test case for {@link MqttCollectImpl}
 */
public class MqttCollectTest {
    private MqttCollectImpl mqttCollect;
    private Metrics metrics;
    private CollectRep.MetricsData.Builder builder;

    @BeforeEach
    public void setup() {
        mqttCollect = new MqttCollectImpl();
        MqttProtocol mqtt = MqttProtocol.builder().build();
        metrics = Metrics.builder()
                .mqtt(mqtt)
                .build();
        builder = CollectRep.MetricsData.newBuilder();
    }

    @Test
    void preCheck() {
        // host is empty
        assertThrows(IllegalArgumentException.class, () -> {
            mqttCollect.preCheck(metrics);
        });

        // port is empty
        assertThrows(IllegalArgumentException.class, () -> {
            MqttProtocol mqtt = MqttProtocol.builder().build();
            mqtt.setHost("example.com");
            metrics.setMqtt(mqtt);
            mqttCollect.preCheck(metrics);
        });

        // protocol version is empty
        assertThrows(IllegalArgumentException.class, () -> {
            MqttProtocol mqtt = MqttProtocol.builder().build();
            mqtt.setHost("example.com");
            mqtt.setPort("1883");
            metrics.setMqtt(mqtt);
            mqttCollect.preCheck(metrics);
        });

        // everything is ok
        assertDoesNotThrow(() -> {
            MqttProtocol mqtt = MqttProtocol.builder().build();
            mqtt.setHost("example.com");
            mqtt.setPort("1883");
            metrics.setMqtt(mqtt);
            mqtt.setProtocolVersion("3.1.1");
            mqttCollect.preCheck(metrics);
        });
    }

    @Test
    void supportProtocol() {
        Assertions.assertEquals(DispatchConstants.PROTOCOL_MQTT, mqttCollect.supportProtocol());
    }

    @Test
    void collect() {
        // with version 3.1.1
        assertDoesNotThrow(() -> {
            MqttProtocol mqtt = MqttProtocol.builder().build();
            mqtt.setHost("example.com");
            mqtt.setPort("1883");
            mqtt.setClientId("clientid");
            mqtt.setTimeout("1");
            mqtt.setProtocolVersion(MqttVersion.MQTT_3_1_1.name());

            metrics.setMqtt(mqtt);
            metrics.setAliasFields(new ArrayList<>());

            mqttCollect.collect(builder, 1L, "app", metrics);
        });

        
        assertDoesNotThrow(() -> {
            MqttProtocol mqtt = MqttProtocol.builder().build();
            mqtt.setHost("example.com");
            mqtt.setPort("1883");
            mqtt.setClientId("clientid");
            mqtt.setTimeout("1");
            mqtt.setProtocolVersion(MqttVersion.MQTT_5_0.name());

            metrics.setMqtt(mqtt);
            metrics.setAliasFields(new ArrayList<>());

            mqttCollect.collect(builder, 1L, "app", metrics);
        });
    }
}
