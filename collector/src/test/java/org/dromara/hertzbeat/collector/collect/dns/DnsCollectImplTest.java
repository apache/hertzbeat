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

package org.dromara.hertzbeat.collector.collect.dns;


import org.dromara.hertzbeat.common.entity.job.Metrics;
import org.dromara.hertzbeat.common.entity.job.protocol.DnsProtocol;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;


/**
 * Test case for {@link DnsCollectImpl}
 * @author Calvin
 */
public class DnsCollectImplTest {
    private DnsProtocol dnsProtocol;
    private DnsCollectImpl dnsCollect;

    @BeforeEach
    public void setup() {
        dnsCollect = new DnsCollectImpl();
        dnsProtocol = DnsProtocol.builder()
                .dnsServerIP("8.8.8.8")
                .address("www.google.com")
                .build();
    }

    @Test
    public void testCollect() {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        long monitorId = 666;
        String app = "testDNS";
        Metrics metrics = new Metrics();
        metrics.setDns(dnsProtocol);

        dnsCollect.collect(builder, monitorId, app, metrics);
    }
}
