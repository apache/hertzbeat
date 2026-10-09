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
import org.junit.jupiter.api.Test;

class RedfishProtocolTest {

    @Test
    void isInvalidValidProtocol() {
        RedfishProtocol protocol = RedfishProtocol.builder()
                .host("127.0.0.1")
                .port("443")
                .username("Administrator")
                .password("Password")
                .timeout("5000")
                .jsonPath(List.of("$.Id"))
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithSchemaHost() {
        RedfishProtocol protocol = RedfishProtocol.builder()
                .host("https://127.0.0.1")
                .port("443")
                .username("Administrator")
                .password("Password")
                .timeout("5000")
                .jsonPath(List.of("$.Id"))
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidHost() {
        RedfishProtocol protocol = RedfishProtocol.builder()
                .host("")
                .port("443")
                .username("Administrator")
                .password("Password")
                .timeout("5000")
                .jsonPath(List.of("$.Id"))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidZeroPort() {
        RedfishProtocol protocol = RedfishProtocol.builder()
                .host("127.0.0.1")
                .port("0")
                .username("Administrator")
                .password("Password")
                .timeout("5000")
                .jsonPath(List.of("$.Id"))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankUsername() {
        RedfishProtocol protocol = RedfishProtocol.builder()
                .host("127.0.0.1")
                .port("443")
                .username("")
                .password("Password")
                .timeout("5000")
                .jsonPath(List.of("$.Id"))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankPassword() {
        RedfishProtocol protocol = RedfishProtocol.builder()
                .host("127.0.0.1")
                .port("443")
                .username("Administrator")
                .password("")
                .timeout("5000")
                .jsonPath(List.of("$.Id"))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankTimeout() {
        RedfishProtocol protocol = RedfishProtocol.builder()
                .host("127.0.0.1")
                .port("443")
                .username("Administrator")
                .password("Password")
                .timeout("")
                .jsonPath(List.of("$.Id"))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNonNumericTimeout() {
        RedfishProtocol protocol = RedfishProtocol.builder()
                .host("127.0.0.1")
                .port("443")
                .username("Administrator")
                .password("Password")
                .timeout("5s")
                .jsonPath(List.of("$.Id"))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidSchema() {
        RedfishProtocol protocol = RedfishProtocol.builder()
                .host("127.0.0.1")
                .port("443")
                .username("Administrator")
                .password("Password")
                .timeout("5000")
                .schema("redfish/v1/Chassis")
                .jsonPath(List.of("$.Id"))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankJsonPath() {
        RedfishProtocol protocol = RedfishProtocol.builder()
                .host("127.0.0.1")
                .port("443")
                .username("Administrator")
                .password("Password")
                .timeout("5000")
                .jsonPath(List.of())
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidJsonPathContainsBlankItem() {
        RedfishProtocol protocol = RedfishProtocol.builder()
                .host("127.0.0.1")
                .port("443")
                .username("Administrator")
                .password("Password")
                .timeout("5000")
                .jsonPath(List.of("$.Id", ""))
                .build();
        assertTrue(protocol.isInvalid());
    }
}
