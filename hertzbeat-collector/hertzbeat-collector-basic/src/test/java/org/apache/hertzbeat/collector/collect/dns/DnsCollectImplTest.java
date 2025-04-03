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
                .tcp("tcp")
                .build();
    }

    @Test
    public void testPreCheck() {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        //metrics is null
        dnsCollect.collect(builder, null);
        assertEquals(CollectRep.Code.FAIL, builder.getCode());

        //invalid DnsProtocol
        Metrics metrics = new Metrics();
        assertThrows(IllegalArgumentException.class, () -> {
            DnsProtocol dns = DnsProtocol.builder().build();
            metrics.setDns(dns);
            dnsCollect.preCheck(metrics);
        });

        //validated DnsProtocol
        assertDoesNotThrow(() -> {
            metrics.setName("question");
            metrics.setDns(dnsProtocol);
            dnsCollect.preCheck(metrics);
        });
    }

    @Test
    public void testCollect() {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        Metrics metrics0 = Metrics.builder()
                .name("question")
                .dns(dnsProtocol)
                .aliasFields(Collections.singletonList("section"))
                .build();
        dnsCollect.collect(builder, metrics0);
        assertEquals(CollectRep.Code.SUCCESS, builder.getCode());
        assertNotNull(builder.getValues(0).getColumns(0));

        // metric name is header
        Metrics metrics1 = Metrics.builder()
                .name("header")
                .dns(dnsProtocol)
                .aliasFields(Collections.singletonList("section"))
                .build();
        dnsCollect.collect(builder, metrics1);
        assertEquals(CollectRep.Code.SUCCESS, builder.getCode());
    }

    @Test
    public void testSupportProtocol() {
        assertEquals(DispatchConstants.PROTOCOL_DNS, dnsCollect.supportProtocol());
    }
}
