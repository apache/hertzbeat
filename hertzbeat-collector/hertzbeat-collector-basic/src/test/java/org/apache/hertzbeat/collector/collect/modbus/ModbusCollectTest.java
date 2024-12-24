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

package org.apache.hertzbeat.collector.collect.modbus;


import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.ModbusProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Test case for {@link ModbusCollectImpl}
 */
public class ModbusCollectTest {
    private ModbusCollectImpl modbusCollect;
    private Metrics metrics;
    private CollectRep.MetricsData.Builder builder;

    @BeforeEach
    public void setup() {
        modbusCollect = new ModbusCollectImpl();
        ModbusProtocol modbus = ModbusProtocol.builder().build();
        metrics = Metrics.builder()
                .modbus(modbus)
                .build();
        builder = CollectRep.MetricsData.newBuilder();
    }

    @Test
    void preCheck() {
        // host is empty
        assertThrows(IllegalArgumentException.class, () -> {
            modbusCollect.preCheck(metrics);
        });

        // port is empty default add 502
        assertThrows(IllegalArgumentException.class, () -> {
            ModbusProtocol modbus = ModbusProtocol.builder().build();
            modbus.setHost("127.0.0.1");
            metrics.setModbus(modbus);
            modbusCollect.preCheck(metrics);
        });

        // driverName version is empty
        assertThrows(IllegalArgumentException.class, () -> {
            ModbusProtocol modbus = ModbusProtocol.builder().build();
            modbus.setHost("127.0.0.1");
            modbus.setPort("502");
            metrics.setModbus(modbus);
            modbusCollect.preCheck(metrics);
        });

        // addressSyntax is empty
        assertThrows(IllegalArgumentException.class, () -> {
            ModbusProtocol modbus = ModbusProtocol.builder().build();
            modbus.setHost("127.0.0.1");
            modbus.setPort("502");
            modbus.setDriverName("modbus-tcp");
            metrics.setModbus(modbus);
            modbusCollect.preCheck(metrics);
        });

        // registerAddresses version is empty
        assertThrows(IllegalArgumentException.class, () -> {
            ModbusProtocol modbus = ModbusProtocol.builder().build();
            modbus.setHost("127.0.0.1");
            modbus.setPort("502");
            modbus.setDriverName("modbus-tcp");
            modbus.setAddressSyntax("holding-register");
            metrics.setModbus(modbus);
            modbusCollect.preCheck(metrics);
        });

        // aliasFields is empty
        assertThrows(IllegalArgumentException.class, () -> {
            ModbusProtocol modbus = ModbusProtocol.builder().build();
            modbus.setHost("127.0.0.1");
            modbus.setPort("502");
            modbus.setDriverName("modbus-tcp");
            modbus.setAddressSyntax("holding-register");
            modbus.setRegisterAddresses(List.of("1"));
            metrics.setModbus(modbus);
            modbusCollect.preCheck(metrics);
        });

        // the number of aliasFields is not equal to registerAddresses(responseTime doesn't count)
        assertThrows(IllegalArgumentException.class, () -> {
            ModbusProtocol modbus = ModbusProtocol.builder().build();
            modbus.setHost("127.0.0.1");
            modbus.setPort("502");
            modbus.setDriverName("modbus-tcp");
            modbus.setAddressSyntax("holding-register");
            modbus.setRegisterAddresses(List.of("1", "2"));
            metrics.setAliasFields(List.of(
                    "responseTime",
                    "holding-register:0"
            ));
            metrics.setModbus(modbus);
            modbusCollect.preCheck(metrics);
        });

        // everything is ok
        assertDoesNotThrow(() -> {
            ModbusProtocol modbus = ModbusProtocol.builder().build();
            modbus.setHost("127.0.0.1");
            modbus.setPort("502");
            modbus.setDriverName("modbus-tcp");
            modbus.setAddressSyntax("holding-register");
            modbus.setRegisterAddresses(List.of("1", "2", "3[2]"));
            modbus.setSlaveId("2");
            modbus.setTimeout("500");
            metrics.setModbus(modbus);
            metrics.setAliasFields(List.of(
                    "responseTime",
                    "holding-register:0",
                    "holding-register:1",
                    "holding-register:2-0",
                    "holding-register:2-1"
            ));
            modbusCollect.preCheck(metrics);
        });
    }

    @Test
    void supportProtocol() {
        Assertions.assertEquals(DispatchConstants.PROTOCOL_MODBUS, modbusCollect.supportProtocol());
    }

    @Test
    void collect() {
        // with holding-register
        assertDoesNotThrow(() -> {
            ModbusProtocol modbus = ModbusProtocol.builder().build();
            modbus.setHost("127.0.0.1");
            modbus.setPort("502");
            modbus.setDriverName("modbus-tcp");
            modbus.setAddressSyntax("holding-register");
            modbus.setRegisterAddresses(List.of("1", "2[3]"));
            modbus.setSlaveId("1");
            modbus.setTimeout("500");

            metrics.setModbus(modbus);
            metrics.setAliasFields(List.of(
                    "responseTime",
                    "holding-register:0",
                    "holding-register:1-0",
                    "holding-register:1-1",
                    "holding-register:1-2"
            ));
            modbusCollect.preCheck(metrics);
            modbusCollect.collect(builder, metrics);
        });

        // with coil
        assertDoesNotThrow(() -> {
            ModbusProtocol modbus = ModbusProtocol.builder().build();
            modbus.setHost("127.0.0.1");
            modbus.setPort("502");
            modbus.setDriverName("modbus-tcp");
            modbus.setAddressSyntax("coil");
            modbus.setRegisterAddresses(List.of("1", "2[3]"));
            modbus.setSlaveId("1");
            modbus.setTimeout("500");

            metrics.setModbus(modbus);
            metrics.setAliasFields(List.of(
                    "responseTime",
                    "coil:0",
                    "coil:1-0",
                    "coil:1-1",
                    "coil:1-2"
            ));
            modbusCollect.preCheck(metrics);
            modbusCollect.collect(builder, metrics);
        });


        // with slaveId2
        // with holding-register
        assertDoesNotThrow(() -> {
            ModbusProtocol modbus = ModbusProtocol.builder().build();
            modbus.setHost("127.0.0.1");
            modbus.setPort("502");
            modbus.setDriverName("modbus-tcp");
            modbus.setAddressSyntax("holding-register");
            modbus.setRegisterAddresses(List.of("1", "2[3]"));
            modbus.setSlaveId("2");
            modbus.setTimeout("500");

            metrics.setModbus(modbus);
            metrics.setAliasFields(List.of(
                    "responseTime",
                    "holding-register:0",
                    "holding-register:1-0",
                    "holding-register:1-1",
                    "holding-register:1-2"
            ));
            modbusCollect.preCheck(metrics);
            modbusCollect.collect(builder, metrics);
        });

    }

}
