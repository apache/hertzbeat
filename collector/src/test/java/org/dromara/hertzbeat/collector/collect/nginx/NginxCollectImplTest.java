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

package org.dromara.hertzbeat.collector.collect.nginx;

import org.dromara.hertzbeat.common.entity.job.Metrics;
import org.dromara.hertzbeat.common.entity.job.protocol.NginxProtocol;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Test case for {@link NginxCollectImpl}
 * @author a-little-fool
 */
public class NginxCollectImplTest {
    private NginxCollectImpl nginxCollect;
    private NginxProtocol nginxProtocol;

    @BeforeEach
    public void setup() {
        nginxCollect = new NginxCollectImpl();
        nginxProtocol = NginxProtocol.builder()
                .host("127.0.0.1")
                .port("80")
                .timeout("6000")
                .url("/nginx-status")
                .build();
    }

    @Test
    public void testNginxCollect() {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        long monitorId = 999;
        String app = "testNginx";

        Metrics metrics = new Metrics();
        metrics.setNginx(nginxProtocol);
        nginxCollect.collect(builder, monitorId, app, metrics);
    }

    @Test
    public void testNginxStatusMatch() {
        String status = "Active connections: 2\n" +
                "server accepts handled requests\n" +
                "4 4 2\n" +
                "Reading: 0 Writing: 1 Waiting: 1";

        // 使用正则表达式匹配并提取所需的键和对应的值
        Pattern keyValuePattern = Pattern.compile("(\\w+): (\\d+)");
        Matcher keyValueMatcher = keyValuePattern.matcher(status);

        while (keyValueMatcher.find()) {
            String key = keyValueMatcher.group(1);
            String value = keyValueMatcher.group(2);

            System.out.println(key + ": " + value);
        }

        // 使用正则表达式匹配并提取"accepts"、"handled"和"requests"的键和对应的值
        Pattern valuesPattern = Pattern.compile("server\\s+(\\w+)\\s+(\\w+)\\s+(\\w+)");
        Matcher valuesMatcher = valuesPattern.matcher(status);

        if (valuesMatcher.find()) {
            String accepts = valuesMatcher.group(1);
            String handled = valuesMatcher.group(2);
            String requests = valuesMatcher.group(3);

            System.out.println("accepts: " + accepts);
            System.out.println("handled: " + handled);
            System.out.println("requests: " + requests);
        }

        Pattern valuePattern = Pattern.compile("(\\d+) (\\d+) (\\d+)");
        Matcher valueMatcher = valuePattern.matcher(status);
        if (valueMatcher.find()) {
            int accepts = Integer.parseInt(valueMatcher.group(1));
            int handled = Integer.parseInt(valueMatcher.group(2));
            int requests = Integer.parseInt(valueMatcher.group(3));
            System.out.println("accepts: " + accepts);
            System.out.println("handled: " + handled);
            System.out.println("requests: " + requests);
        }
    }

    @Test
    public void testReqStatusMatch() {
        String urlContent = "zone_name\tkey\tmax_active\tmax_bw\ttraffic\trequests\tactive\tbandwidth\n" +
                "server_addr\t172.17.0.3\t2\t 440\t68K\t23\t1\t 0\n" +
                "server_name\tlocalhost\t2\t 440\t68K\t23\t1\t 0\n" +
                "server_url\tlocalhost/\t1\t 0\t 0\t4\t0\t 0\n" +
                "server_url\tlocalhost/index.html\t1\t 104\t27K\t4\t0\t 0\n" +
                "server_url\tlocalhost/nginx-status\t1\t 32\t 9896\t5\t0\t 0\n" +
                "server_url\tlocalhost/req-status\t1\t 0\t31K\t10\t1\t 0";

        String[] lines = urlContent.split("\\r?\\n");
        List<String> zoneNames = new ArrayList<>();
        List<String> keys = new ArrayList<>();
        List<String> maxActives = new ArrayList<>();
        List<String> maxBws = new ArrayList<>();
        List<String> traffics = new ArrayList<>();
        List<String> requests = new ArrayList<>();
        List<String> actives = new ArrayList<>();
        List<String> bandwidths = new ArrayList<>();

        for (int i = 1; i < lines.length; i++) {
            String[] values = lines[i].split("\\s+");
            zoneNames.add(values[0]);
            keys.add(values[1]);
            maxActives.add(values[2]);
            maxBws.add(values[3]);
            traffics.add(values[4]);
            requests.add(values[5]);
            actives.add(values[6]);
            bandwidths.add(values[7]);
        }

        System.out.println("zone_name: " + zoneNames);
        System.out.println("key: " + keys);
        System.out.println("max_active: " + maxActives);
        System.out.println("max_bw: " + maxBws);
        System.out.println("traffic: " + traffics);
        System.out.println("requests: " + requests);
        System.out.println("active: " + actives);
        System.out.println("bandwidth: " + bandwidths);
    }
}
