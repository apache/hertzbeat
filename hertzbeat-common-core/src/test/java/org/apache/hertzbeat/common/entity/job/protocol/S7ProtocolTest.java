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

import java.util.Arrays;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class S7ProtocolTest {

    @Test
    void isInvalidValidProtocol() {
        S7Protocol protocol = S7Protocol.builder()
                .host("192.168.1.1")
                .port("102")
                .driverName("s7")
                .addressSyntax("S7")
                .rackId("0")
                .slotId("1")
                .controllerType("S7_1200")
                .registerAddresses(Arrays.asList("DB1.DBW0", "DB1.DBW2"))
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithTimeout() {
        S7Protocol protocol = S7Protocol.builder()
                .host("localhost")
                .port("102")
                .driverName("s7")
                .addressSyntax("S7")
                .rackId("0")
                .slotId("1")
                .controllerType("S7_1200")
                .timeout("5000")
                .registerAddresses(Arrays.asList("DB1.DBW0"))
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidHost() {
        S7Protocol protocol = S7Protocol.builder()
                .host("")
                .port("102")
                .driverName("s7")
                .addressSyntax("S7")
                .rackId("0")
                .slotId("1")
                .controllerType("S7_1200")
                .registerAddresses(Arrays.asList("DB1.DBW0"))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidPort() {
        S7Protocol protocol = S7Protocol.builder()
                .host("192.168.1.1")
                .port("99999")
                .driverName("s7")
                .addressSyntax("S7")
                .rackId("0")
                .slotId("1")
                .controllerType("S7_1200")
                .registerAddresses(Arrays.asList("DB1.DBW0"))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankDriverName() {
        S7Protocol protocol = S7Protocol.builder()
                .host("192.168.1.1")
                .port("102")
                .driverName("")
                .addressSyntax("S7")
                .rackId("0")
                .slotId("1")
                .controllerType("S7_1200")
                .registerAddresses(Arrays.asList("DB1.DBW0"))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankAddressSyntax() {
        S7Protocol protocol = S7Protocol.builder()
                .host("192.168.1.1")
                .port("102")
                .driverName("s7")
                .addressSyntax("")
                .rackId("0")
                .slotId("1")
                .controllerType("S7_1200")
                .registerAddresses(Arrays.asList("DB1.DBW0"))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankControllerType() {
        S7Protocol protocol = S7Protocol.builder()
                .host("192.168.1.1")
                .port("102")
                .driverName("s7")
                .addressSyntax("S7")
                .rackId("0")
                .slotId("1")
                .controllerType("")
                .registerAddresses(Arrays.asList("DB1.DBW0"))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNonNumericRackId() {
        S7Protocol protocol = S7Protocol.builder()
                .host("192.168.1.1")
                .port("102")
                .driverName("s7")
                .addressSyntax("S7")
                .rackId("abc")
                .slotId("1")
                .controllerType("S7_1200")
                .registerAddresses(Arrays.asList("DB1.DBW0"))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNonNumericSlotId() {
        S7Protocol protocol = S7Protocol.builder()
                .host("192.168.1.1")
                .port("102")
                .driverName("s7")
                .addressSyntax("S7")
                .rackId("0")
                .slotId("xyz")
                .controllerType("S7_1200")
                .registerAddresses(Arrays.asList("DB1.DBW0"))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNonNumericTimeout() {
        S7Protocol protocol = S7Protocol.builder()
                .host("192.168.1.1")
                .port("102")
                .driverName("s7")
                .addressSyntax("S7")
                .rackId("0")
                .slotId("1")
                .controllerType("S7_1200")
                .timeout("abc")
                .registerAddresses(Arrays.asList("DB1.DBW0"))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidEmptyRegisterAddresses() {
        S7Protocol protocol = S7Protocol.builder()
                .host("192.168.1.1")
                .port("102")
                .driverName("s7")
                .addressSyntax("S7")
                .rackId("0")
                .slotId("1")
                .controllerType("S7_1200")
                .registerAddresses(Collections.emptyList())
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullRegisterAddresses() {
        S7Protocol protocol = S7Protocol.builder()
                .host("192.168.1.1")
                .port("102")
                .driverName("s7")
                .addressSyntax("S7")
                .rackId("0")
                .slotId("1")
                .controllerType("S7_1200")
                .registerAddresses(null)
                .build();
        assertTrue(protocol.isInvalid());
    }
}
