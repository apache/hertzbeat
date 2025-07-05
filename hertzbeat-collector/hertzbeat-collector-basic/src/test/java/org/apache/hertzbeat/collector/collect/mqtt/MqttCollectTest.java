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

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.MqttProtocol;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link MqttCollectImpl}
 */
class MqttCollectTest {
    private MqttCollectImpl mqttCollect;
    private Metrics metrics;
    private MqttProtocol.MqttProtocolBuilder mqttBuilder;

    @BeforeEach
    void setup() {
        mqttCollect = new MqttCollectImpl();
        metrics = new Metrics();

        // Initialize base MQTT parameters for test cases
        mqttBuilder = MqttProtocol.builder()
                .host("example.com")
                .port("1883")
                .protocol("mqtt")
                .timeout("5000")
                .keepalive("60");
    }

    // Region: preCheck validation tests

    @Test
    // Verify preCheck throws exception when host is missing
    void preCheckShouldThrowWhenHostMissing() {
        metrics.setMqtt(mqttBuilder.host("").build());
        assertThrows(IllegalArgumentException.class, () -> mqttCollect.preCheck(metrics));
    }

    @Test
    // Verify preCheck throws exception when port is missing
    void preCheckShouldThrowWhenPortMissing() {
        metrics.setMqtt(mqttBuilder.port("").build());
        assertThrows(IllegalArgumentException.class, () -> mqttCollect.preCheck(metrics));
    }

    @Test
    // Verify preCheck throws exception when MQTTS mutual auth is enabled but CA cert is missing
    void preCheckShouldThrowWhenMqttsMutualAuthMissingCerts() {
        metrics.setMqtt(mqttBuilder
                .protocol("mqtts")
                .enableMutualAuth("true")
                .caCert("")
                .clientCert("client.crt")
                .clientKey("client.key")
                .build());
        assertThrows(IllegalArgumentException.class, () -> mqttCollect.preCheck(metrics));
    }

    @Test
    // Verify preCheck succeeds with valid standard MQTT parameters
    void preCheckShouldSucceedWithValidMqttParams() {
        metrics.setMqtt(mqttBuilder.build());
        assertDoesNotThrow(() -> mqttCollect.preCheck(metrics));
    }

    @Test
    // Verify preCheck succeeds with valid MQTTS parameters including mutual authentication
    void preCheckShouldSucceedWithValidMqttsMutualAuth() {
        metrics.setMqtt(mqttBuilder
                .protocol("mqtts")
                .enableMutualAuth("true")
                .caCert("ca.pem")
                .clientCert("client.crt")
                .clientKey("client.key")
                .build());
        assertDoesNotThrow(() -> mqttCollect.preCheck(metrics));
    }
    // End region

    @Test
    // Verify supportProtocol method returns correct MQTT constant
    void supportProtocolShouldReturnMqttConstant() {
        assertEquals(DispatchConstants.PROTOCOL_MQTT, mqttCollect.supportProtocol());
    }
}
