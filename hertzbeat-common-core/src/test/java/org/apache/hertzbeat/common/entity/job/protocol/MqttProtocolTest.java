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

package org.apache.hertzbeat.common.entity.job.protocol;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MqttProtocolTest {

    @Test
    void isInvalidValidProtocol() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("192.168.1.1")
                .port("1883")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithDomain() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("mqtt.example.com")
                .port("1883")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithLocalhost() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("localhost")
                .port("1883")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidHost() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("")
                .port("1883")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullHost() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host(null)
                .port("1883")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidPort() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("192.168.1.1")
                .port("99999")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankPort() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("192.168.1.1")
                .port("")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullPort() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("192.168.1.1")
                .port(null)
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidTimeout() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("192.168.1.1")
                .port("1883")
                .timeout("5000")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankTimeout() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("192.168.1.1")
                .port("1883")
                .timeout("")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidTimeout() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("192.168.1.1")
                .port("1883")
                .timeout("abc")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidKeepalive() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("192.168.1.1")
                .port("1883")
                .keepalive("60")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidKeepalive() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("192.168.1.1")
                .port("1883")
                .keepalive("abc")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolMqtt() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("192.168.1.1")
                .port("1883")
                .protocol("MQTT")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolMqtts() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("192.168.1.1")
                .port("8883")
                .protocol("MQTTS")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidProtocol() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("192.168.1.1")
                .port("1883")
                .protocol("INVALID")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidTlsVersion() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("192.168.1.1")
                .port("8883")
                .tlsVersion("TLSv1.2")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidTlsVersionV13() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("192.168.1.1")
                .port("8883")
                .tlsVersion("TLSv1.3")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidTlsVersion() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("192.168.1.1")
                .port("8883")
                .tlsVersion("TLSv1.0")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidInsecureSkipVerify() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("192.168.1.1")
                .port("8883")
                .insecureSkipVerify("true")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidInsecureSkipVerify() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("192.168.1.1")
                .port("8883")
                .insecureSkipVerify("invalid")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidEnableMutualAuth() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("192.168.1.1")
                .port("8883")
                .enableMutualAuth("true")
                .clientCert("/path/to/cert")
                .clientKey("/path/to/key")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidEnableMutualAuthWithoutClientCert() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("192.168.1.1")
                .port("8883")
                .enableMutualAuth("true")
                .clientKey("/path/to/key")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidEnableMutualAuthWithoutClientKey() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("192.168.1.1")
                .port("8883")
                .enableMutualAuth("true")
                .clientCert("/path/to/cert")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidEnableMutualAuthFalseWithoutCert() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("192.168.1.1")
                .port("8883")
                .enableMutualAuth("false")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidEnableMutualAuth() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("192.168.1.1")
                .port("8883")
                .enableMutualAuth("invalid")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidAuth() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("192.168.1.1")
                .port("1883")
                .username("user")
                .password("pass")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidOnlyUsername() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("192.168.1.1")
                .port("1883")
                .username("user")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidOnlyPassword() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("192.168.1.1")
                .port("1883")
                .password("pass")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNoAuth() {
        MqttProtocol protocol = MqttProtocol.builder()
                .host("192.168.1.1")
                .port("1883")
                .build();
        assertFalse(protocol.isInvalid());
    }
}