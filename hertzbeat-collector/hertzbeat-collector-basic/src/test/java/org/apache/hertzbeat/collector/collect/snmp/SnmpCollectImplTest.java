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

package org.apache.hertzbeat.collector.collect.snmp;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.nio.charset.Charset;
import java.util.HexFormat;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.SnmpProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.snmp4j.smi.OID;
import org.snmp4j.smi.OctetString;
import org.snmp4j.smi.VariableBinding;

/**
 * Test case for {@link SnmpCollectImpl}
 */
class SnmpCollectImplTest {
    private SnmpCollectImpl snmpCollect;
    private Metrics metrics;
    private CollectRep.MetricsData.Builder builder;

    @BeforeEach
    void setUp() {
        snmpCollect = new SnmpCollectImpl();
        metrics = new Metrics();
        SnmpProtocol snmap = new SnmpProtocol();
        snmap.setHost("127.0.0.1");
        snmap.setPort("161");
        snmap.setVersion("2c");
        metrics.setSnmp(snmap);
        builder = CollectRep.MetricsData.newBuilder();
    }

    @Test
    void preCheck() {
        // metrics is null
        assertThrows(IllegalArgumentException.class, () -> {
            snmpCollect.preCheck(null);
        });

        // snmp protocol is null
        assertThrows(IllegalArgumentException.class, () -> {
            Metrics metrics = new Metrics();
            snmpCollect.preCheck(metrics);
        });

        // snmp host is null
        assertThrows(IllegalArgumentException.class, () -> {
            Metrics metrics = new Metrics();
            metrics.setSnmp(new SnmpProtocol());
            snmpCollect.preCheck(metrics);
        });

        // snmp port is null
        assertThrows(IllegalArgumentException.class, () -> {
            SnmpProtocol snmap = new SnmpProtocol();
            snmap.setHost("127.0.0.1");
            Metrics metrics = new Metrics();
            metrics.setSnmp(snmap);
            snmpCollect.preCheck(metrics);
        });

        // snmp version is null
        assertThrows(IllegalArgumentException.class, () -> {
            SnmpProtocol snmap = new SnmpProtocol();
            snmap.setHost("127.0.0.1");
            snmap.setPort("161");
            Metrics metrics = new Metrics();
            metrics.setSnmp(snmap);
            snmpCollect.preCheck(metrics);
        });

        // everything is ok
        assertDoesNotThrow(() -> {
            snmpCollect.preCheck(metrics);
        });
    }

    @Test
    void collect() {
        assertDoesNotThrow(() -> {
            snmpCollect.collect(builder, metrics);
            assertEquals(CollectRep.Code.FAIL, builder.getCode());
        });
    }

    @Test
    void supportProtocol() {
        assertEquals(DispatchConstants.PROTOCOL_SNMP, snmpCollect.supportProtocol());
    }

    @Test
    void testBingdingHexValueToStringForMacAddress() {
        // Standard MAC address
        byte[] macBytes1 = HexFormat.of().parseHex("001122334455");
        VariableBinding binding1 = new VariableBinding(new OID("1.3.6.1.2.1.3.1.1.2"), new OctetString(macBytes1));
        assertEquals(binding1.toValueString(), snmpCollect.bingdingHexValueToString(binding1));

        // MAC address whose byte pairs fall within GB2312 character range (b0a1, c2d3, e4f5)
        // Must NOT be mistakenly decoded as Chinese characters
        byte[] macBytes2 = HexFormat.of().parseHex("b0a1c2d3e4f5");
        VariableBinding binding2 = new VariableBinding(new OID("1.3.6.1.2.1.3.1.1.2"), new OctetString(macBytes2));
        assertEquals(binding2.toValueString(), snmpCollect.bingdingHexValueToString(binding2));
    }

    @Test
    void testBingdingHexValueToStringForChineseText() {
        // Chinese string in GB2312 (4 bytes: c4 e3 ba c3)
        byte[] gbBytes = "你好".getBytes(Charset.forName("GB2312"));
        VariableBinding binding = new VariableBinding(new OID("1.3.6.1.2.1.1.1.0"), new OctetString(gbBytes));
        assertEquals("你好", snmpCollect.bingdingHexValueToString(binding));
    }

    @Test
    void testBingdingHexValueToStringForDateAndTime() {
        // SNMP DateAndTime format: 8 bytes (2026-11-24,22:30:15.0)
        byte[] dateBytes = new byte[] {
            (byte) 0x07, (byte) 0xEA, // Year 2026
            (byte) 11,                // Month
            (byte) 24,                // Day
            (byte) 22,                // Hour
            (byte) 30,                // Minute
            (byte) 15,                // Second
            (byte) 0                  // Deci-second
        };
        VariableBinding binding = new VariableBinding(new OID("1.3.6.1.2.1.25.1.2.0"), new OctetString(dateBytes));
        assertEquals("2026-11-24,22:30:15.0", snmpCollect.bingdingHexValueToString(binding));
    }

    @Test
    void testBingdingHexValueToStringForArbitraryNonTextBytes() {
        // Non-text, non-MAC, non-DateAndTime binary bytes that fail GB2312 decoding
        byte[] invalidGbBytes = new byte[] { (byte) 0x80, (byte) 0x81, (byte) 0x82, (byte) 0x83, (byte) 0x84 };
        VariableBinding binding = new VariableBinding(new OID("1.3.6.1.4.1.9999.1.1"), new OctetString(invalidGbBytes));
        // Should preserve original colon-separated hex format rather than converting to corrupted string
        assertEquals(binding.toValueString(), snmpCollect.bingdingHexValueToString(binding));
    }
}
