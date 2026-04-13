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

class KafkaProtocolTest {

    @Test
    void isInvalidValidProtocol() {
        KafkaProtocol protocol = KafkaProtocol.builder()
                .host("192.168.1.1")
                .port("9092")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithDomain() {
        KafkaProtocol protocol = KafkaProtocol.builder()
                .host("kafka.example.com")
                .port("9092")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithLocalhost() {
        KafkaProtocol protocol = KafkaProtocol.builder()
                .host("localhost")
                .port("9092")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidHost() {
        KafkaProtocol protocol = KafkaProtocol.builder()
                .host("")
                .port("9092")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullHost() {
        KafkaProtocol protocol = KafkaProtocol.builder()
                .host(null)
                .port("9092")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidPort() {
        KafkaProtocol protocol = KafkaProtocol.builder()
                .host("192.168.1.1")
                .port("99999")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankPort() {
        KafkaProtocol protocol = KafkaProtocol.builder()
                .host("192.168.1.1")
                .port("")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullPort() {
        KafkaProtocol protocol = KafkaProtocol.builder()
                .host("192.168.1.1")
                .port(null)
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidTimeout() {
        KafkaProtocol protocol = KafkaProtocol.builder()
                .host("192.168.1.1")
                .port("9092")
                .timeout("5000")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankTimeout() {
        KafkaProtocol protocol = KafkaProtocol.builder()
                .host("192.168.1.1")
                .port("9092")
                .timeout("")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidNullTimeout() {
        KafkaProtocol protocol = KafkaProtocol.builder()
                .host("192.168.1.1")
                .port("9092")
                .timeout(null)
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidTimeout() {
        KafkaProtocol protocol = KafkaProtocol.builder()
                .host("192.168.1.1")
                .port("9092")
                .timeout("abc")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidMonitorInternalTopicTrue() {
        KafkaProtocol protocol = KafkaProtocol.builder()
                .host("192.168.1.1")
                .port("9092")
                .monitorInternalTopic("true")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidMonitorInternalTopicFalse() {
        KafkaProtocol protocol = KafkaProtocol.builder()
                .host("192.168.1.1")
                .port("9092")
                .monitorInternalTopic("false")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidMonitorInternalTopic() {
        KafkaProtocol protocol = KafkaProtocol.builder()
                .host("192.168.1.1")
                .port("9092")
                .monitorInternalTopic("invalid")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankMonitorInternalTopic() {
        KafkaProtocol protocol = KafkaProtocol.builder()
                .host("192.168.1.1")
                .port("9092")
                .monitorInternalTopic("")
                .build();
        assertFalse(protocol.isInvalid());
    }
}