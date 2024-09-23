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

import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.SnmpProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

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
            snmpCollect.collect(builder, 0, null, metrics);
            assertEquals(CollectRep.Code.FAIL, builder.getCode());
        });
    }

    @Test
    void supportProtocol() {
        assertEquals(DispatchConstants.PROTOCOL_SNMP, snmpCollect.supportProtocol());
    }
}
