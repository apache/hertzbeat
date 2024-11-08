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

package org.apache.hertzbeat.collector.collect.dns;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Collections;

import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.DnsProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link DnsCollectImpl}
 */
public class DnsCollectImplTest {
    private DnsProtocol dnsProtocol;
    private DnsCollectImpl dnsCollect;

    @BeforeEach
    public void setup() {
        dnsCollect = new DnsCollectImpl();
        dnsProtocol = DnsProtocol.builder()
                .dnsServerIP("8.8.8.8")
                .queryClass("IN")
                .address("www.google.com")
                .timeout("3000")
                .port("53")
                .build();
    }

    @Test
    public void testPreCheck() {
        assertThrows(IllegalArgumentException.class, () -> {
            Metrics metrics = new Metrics();
            metrics.setName("question");
            metrics.setDns(dnsProtocol);
            dnsCollect.preCheck(metrics);
        });

        //query class is blank
        assertThrows(IllegalArgumentException.class, () -> {
            DnsProtocol dns = DnsProtocol.builder().build();

            Metrics metrics = new Metrics();
            metrics.setDns(dns);
            dnsCollect.preCheck(metrics);
        });

        // no exception throws
        assertDoesNotThrow(() -> {
            dnsProtocol.setTcp("tcp");
            Metrics metrics = new Metrics();
            metrics.setDns(dnsProtocol);
            dnsCollect.preCheck(metrics);
        });
    }

    @Test
    public void testCollect() {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        long monitorId = 666;
        String app = "testDNS";
        Metrics metrics = new Metrics();
        metrics.setName("question");
        metrics.setDns(dnsProtocol);
        metrics.setAliasFields(Collections.singletonList("section"));
        dnsCollect.collect(builder, monitorId, app, metrics);
        assertNotNull(builder.getValues(0).getColumns(0));

        // dns is null, no exception throws
        assertDoesNotThrow(() -> {
            dnsCollect.collect(builder, monitorId, app, null);
        });

        // metric name is header
        assertDoesNotThrow(() -> {
            Metrics metrics1 = new Metrics();
            metrics1.setName("header");
            metrics1.setDns(dnsProtocol);
            metrics1.setAliasFields(Collections.singletonList("section"));
            dnsCollect.collect(builder, monitorId, app, metrics1);
        });
    }

    @Test
    public void testSupportProtocol() {
        assertEquals(DispatchConstants.PROTOCOL_DNS, dnsCollect.supportProtocol());
    }
}
