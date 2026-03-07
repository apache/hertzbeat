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

class ModbusProtocolTest {

    @Test
    void isInvalidValidProtocol() {
        ModbusProtocol protocol = ModbusProtocol.builder()
                .host("192.168.1.1")
                .port("502")
                .driverName("modbus")
                .addressSyntax("Modbus")
                .slaveId("1")
                .registerAddresses(Arrays.asList("40001", "40002"))
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithTimeout() {
        ModbusProtocol protocol = ModbusProtocol.builder()
                .host("localhost")
                .port("502")
                .driverName("modbus")
                .addressSyntax("Modbus")
                .slaveId("1")
                .timeout("5000")
                .registerAddresses(Arrays.asList("40001"))
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidHost() {
        ModbusProtocol protocol = ModbusProtocol.builder()
                .host("")
                .port("502")
                .driverName("modbus")
                .addressSyntax("Modbus")
                .slaveId("1")
                .registerAddresses(Arrays.asList("40001"))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidPort() {
        ModbusProtocol protocol = ModbusProtocol.builder()
                .host("192.168.1.1")
                .port("99999")
                .driverName("modbus")
                .addressSyntax("Modbus")
                .slaveId("1")
                .registerAddresses(Arrays.asList("40001"))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankDriverName() {
        ModbusProtocol protocol = ModbusProtocol.builder()
                .host("192.168.1.1")
                .port("502")
                .driverName("")
                .addressSyntax("Modbus")
                .slaveId("1")
                .registerAddresses(Arrays.asList("40001"))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankAddressSyntax() {
        ModbusProtocol protocol = ModbusProtocol.builder()
                .host("192.168.1.1")
                .port("502")
                .driverName("modbus")
                .addressSyntax("")
                .slaveId("1")
                .registerAddresses(Arrays.asList("40001"))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankSlaveId() {
        ModbusProtocol protocol = ModbusProtocol.builder()
                .host("192.168.1.1")
                .port("502")
                .driverName("modbus")
                .addressSyntax("Modbus")
                .slaveId("")
                .registerAddresses(Arrays.asList("40001"))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNonNumericTimeout() {
        ModbusProtocol protocol = ModbusProtocol.builder()
                .host("192.168.1.1")
                .port("502")
                .driverName("modbus")
                .addressSyntax("Modbus")
                .slaveId("1")
                .timeout("abc")
                .registerAddresses(Arrays.asList("40001"))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidEmptyRegisterAddresses() {
        ModbusProtocol protocol = ModbusProtocol.builder()
                .host("192.168.1.1")
                .port("502")
                .driverName("modbus")
                .addressSyntax("Modbus")
                .slaveId("1")
                .registerAddresses(Collections.emptyList())
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullRegisterAddresses() {
        ModbusProtocol protocol = ModbusProtocol.builder()
                .host("192.168.1.1")
                .port("502")
                .driverName("modbus")
                .addressSyntax("Modbus")
                .slaveId("1")
                .registerAddresses(null)
                .build();
        assertTrue(protocol.isInvalid());
    }
}