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

import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class SnmpProtocolTest {

    @Test
    void isInvalidValidV2cProtocol() {
        SnmpProtocol protocol = SnmpProtocol.builder()
                .host("192.168.1.1")
                .port("161")
                .version("2c")
                .community("public")
                .oids(validOids())
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidNumericV1Protocol() {
        SnmpProtocol protocol = SnmpProtocol.builder()
                .host("192.168.1.1")
                .port("161")
                .version("0")
                .community("public")
                .oids(validOids())
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidNumericV2cProtocol() {
        SnmpProtocol protocol = SnmpProtocol.builder()
                .host("192.168.1.1")
                .port("161")
                .version("1")
                .community("public")
                .oids(validOids())
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidV3Protocol() {
        SnmpProtocol protocol = SnmpProtocol.builder()
                .host("192.168.1.1")
                .port("161")
                .version("3")
                .username("user")
                .authPassphrase("authPass")
                .privPassphrase("privPass")
                .oids(validOids())
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidMissingCommunityForV2c() {
        SnmpProtocol protocol = SnmpProtocol.builder()
                .host("192.168.1.1")
                .port("161")
                .version("2c")
                .oids(validOids())
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidMissingCredentialsForV3() {
        SnmpProtocol protocol = SnmpProtocol.builder()
                .host("192.168.1.1")
                .port("161")
                .version("v3")
                .username("user")
                .oids(validOids())
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidUnsupportedOperation() {
        SnmpProtocol protocol = SnmpProtocol.builder()
                .host("192.168.1.1")
                .port("161")
                .version("2c")
                .community("public")
                .operation("bulk")
                .oids(validOids())
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidEmptyOids() {
        SnmpProtocol protocol = SnmpProtocol.builder()
                .host("192.168.1.1")
                .port("161")
                .version("2c")
                .community("public")
                .oids(Map.of())
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidUnsupportedVersion() {
        SnmpProtocol protocol = SnmpProtocol.builder()
                .host("192.168.1.1")
                .port("161")
                .version("4")
                .community("public")
                .oids(validOids())
                .build();
        assertTrue(protocol.isInvalid());
    }

    private Map<String, String> validOids() {
        Map<String, String> oids = new HashMap<>();
        oids.put("name", "1.3.6.1.2.1.1.5.0");
        return oids;
    }
}
