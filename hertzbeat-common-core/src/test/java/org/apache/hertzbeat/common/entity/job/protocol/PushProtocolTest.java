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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.apache.hertzbeat.common.entity.dto.Field;
import org.junit.jupiter.api.Test;

class PushProtocolTest {

    @Test
    void isInvalidValidProtocol() {
        PushProtocol protocol = PushProtocol.builder()
                .host("127.0.0.1")
                .port("1157")
                .uri("/api/push")
                .fields(List.of(Field.builder().name("cpuUsage").type((byte) 0).build()))
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithSchemaHost() {
        PushProtocol protocol = PushProtocol.builder()
                .host("http://127.0.0.1")
                .port("1157")
                .uri("/api/push")
                .fields(List.of(Field.builder().name("status").type((byte) 1).build()))
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidHost() {
        PushProtocol protocol = PushProtocol.builder()
                .host("")
                .port("1157")
                .uri("/api/push")
                .fields(List.of(Field.builder().name("status").type((byte) 1).build()))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidZeroPort() {
        PushProtocol protocol = PushProtocol.builder()
                .host("127.0.0.1")
                .port("0")
                .uri("/api/push")
                .fields(List.of(Field.builder().name("status").type((byte) 1).build()))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankUri() {
        PushProtocol protocol = PushProtocol.builder()
                .host("127.0.0.1")
                .port("1157")
                .uri("")
                .fields(List.of(Field.builder().name("status").type((byte) 1).build()))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidUriWithoutLeadingSlash() {
        PushProtocol protocol = PushProtocol.builder()
                .host("127.0.0.1")
                .port("1157")
                .uri("api/push")
                .fields(List.of(Field.builder().name("status").type((byte) 1).build()))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankFields() {
        PushProtocol protocol = PushProtocol.builder()
                .host("127.0.0.1")
                .port("1157")
                .uri("/api/push")
                .fields(List.of())
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidFieldWithoutName() {
        PushProtocol protocol = PushProtocol.builder()
                .host("127.0.0.1")
                .port("1157")
                .uri("/api/push")
                .fields(List.of(Field.builder().name("").type((byte) 1).build()))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidFieldWithoutType() {
        PushProtocol protocol = PushProtocol.builder()
                .host("127.0.0.1")
                .port("1157")
                .uri("/api/push")
                .fields(List.of(Field.builder().name("status").type(null).build()))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidFieldWithUnsupportedType() {
        PushProtocol protocol = PushProtocol.builder()
                .host("127.0.0.1")
                .port("1157")
                .uri("/api/push")
                .fields(List.of(Field.builder().name("status").type((byte) 2).build()))
                .build();
        assertTrue(protocol.isInvalid());
    }
}
