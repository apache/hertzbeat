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

package org.apache.hertzbeat.collector.collect.nginx;

import static org.apache.hertzbeat.common.constants.CommonConstants.TYPE_STRING;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.apache.hertzbeat.collector.collect.common.http.CommonHttpClient;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.NginxProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.http.Header;
import org.apache.http.HttpEntity;
import org.apache.http.ProtocolVersion;
import org.apache.http.StatusLine;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.entity.ContentType;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.message.BasicHeader;
import org.apache.http.message.BasicStatusLine;
import org.apache.http.protocol.HttpContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link NginxCollectImpl}
 */
@ExtendWith(MockitoExtension.class)
public class NginxCollectImplTest {

    @InjectMocks
    private NginxCollectImpl nginxCollect;

    @Mock
    private CloseableHttpClient client;

    @Mock
    private CloseableHttpResponse mockHttpResponse;

    @BeforeEach
    public void setup() {
    }

    @Test
    void preCheck() {
        // metrics is null
        assertThrows(IllegalArgumentException.class, () -> {
            nginxCollect.preCheck(null);
        });

        // nginx protocol is null
        assertThrows(IllegalArgumentException.class, () -> {
            nginxCollect.preCheck(Metrics.builder().build());
        });

        // nginx protocol is invalid
        assertThrows(IllegalArgumentException.class, () -> {
            nginxCollect.preCheck(Metrics.builder().nginx(NginxProtocol.builder().build()).build());
        });
    }

    @Test
    public void testNginxCollectFail() throws IOException {
        NginxProtocol nginxProtocol = NginxProtocol.builder()
                .host("127.0.0.1")
                .port("8080")
                .timeout("6000")
                .url("/nginx-status")
                .build();

        try (MockedStatic<CommonHttpClient> mockStatic = Mockito.mockStatic(CommonHttpClient.class)) {
            mockStatic.when(CommonHttpClient::getHttpClient).thenReturn(client);
            Mockito.when(client.execute(Mockito.any(HttpUriRequest.class), Mockito.any(HttpContext.class)))
                    .thenReturn(mockHttpResponse);

            StatusLine statusLine = new BasicStatusLine(new ProtocolVersion("http", 1, 1),
                    500, "fail");
            Mockito.when(mockHttpResponse.getStatusLine()).thenReturn(statusLine);
            CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
            long monitorId = 999;
            String app = "testNginx";
            Metrics metrics = new Metrics();
            metrics.setName("nginx_status");
            metrics.setNginx(nginxProtocol);
            nginxCollect.preCheck(metrics);
            nginxCollect.collect(builder, monitorId, app, metrics);
            assertEquals(builder.getCode(), CollectRep.Code.FAIL);
        }

    }

    @Test
    public void testNginxStatusCollect() throws IOException {
        NginxProtocol nginxProtocol = NginxProtocol.builder()
                .host("127.0.0.1")
                .port("8080")
                .timeout("6000")
                .url("/nginx-status")
                .build();

        try (MockedStatic<CommonHttpClient> mockedStatic = Mockito.mockStatic(CommonHttpClient.class)) {
            mockedStatic.when(CommonHttpClient::getHttpClient).thenReturn(client);

            Mockito.when(client.execute(Mockito.any(HttpUriRequest.class), Mockito.any(HttpContext.class)))
                    .thenReturn(mockHttpResponse);

            StatusLine statusLine = new BasicStatusLine(new ProtocolVersion("http", 1, 1),
                    200, "OK");
            Mockito.when(mockHttpResponse.getStatusLine()).thenReturn(statusLine);

            String responseTemp = """
                    Active connections: %s\s
                    server accepts handled requests
                     5 5 5\s
                    Reading: %s Writing: 1 Waiting: 1\s
                    """;
            String connections = "2";
            String reading = "1";
            String response = String.format(responseTemp, connections, reading);
            HttpEntity entity = new CustomHttpEntity(response, ContentType.create("text/plain", "UTF-8"));
            Mockito.when(mockHttpResponse.getEntity()).thenReturn(entity);

            CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
            long monitorId = 999;
            String app = "testNginx";

            Metrics metrics = new Metrics();
            List<String> aliasField = new ArrayList<>();
            aliasField.add("active");
            aliasField.add("reading");

            List<Metrics.Field> fields = new ArrayList<>();
            fields.add(Metrics.Field.builder()
                    .field("active")
                    .type(TYPE_STRING)
                    .build());
            fields.add(Metrics.Field.builder()
                    .field("reading")
                    .type(TYPE_STRING)
                    .build());

            metrics.setAliasFields(aliasField);
            metrics.setFields(fields);
            metrics.setName("nginx_status");
            metrics.setNginx(nginxProtocol);
            nginxCollect.preCheck(metrics);
            nginxCollect.collect(builder, monitorId, app, metrics);
            assertEquals(builder.getCode(), CollectRep.Code.SUCCESS);
            for (CollectRep.ValueRow row : builder.getValuesList()) {
                assertEquals(row.getColumnsCount(), 2);
                assertEquals(row.getColumns(0), connections);
                assertEquals(row.getColumns(1), reading);
            }
        }
    }

    @Test
    public void testNginxReqStatusCollect() throws IOException {
        NginxProtocol nginxProtocol = NginxProtocol.builder()
                .host("127.0.0.1")
                .port("8080")
                .timeout("6000")
                .url("/req-status")
                .build();

        try (MockedStatic<CommonHttpClient> mockedStatic = Mockito.mockStatic(CommonHttpClient.class)) {
            mockedStatic.when(CommonHttpClient::getHttpClient).thenReturn(client);

            Mockito.when(client.execute(Mockito.any(HttpUriRequest.class), Mockito.any(HttpContext.class)))
                    .thenReturn(mockHttpResponse);

            StatusLine statusLine = new BasicStatusLine(new ProtocolVersion("http", 1, 1),
                    200, "OK");
            Mockito.when(mockHttpResponse.getStatusLine()).thenReturn(statusLine);

            String responseTemp = """
                    zone_name       key     max_active      max_bw  traffic requests        active  bandwidth
                    imgstore_appid  43    27      6M      63G     %s  0        %s
                    imgstore_appid  53    329     87M     2058G   %s 50      %s
                    """;
            String request0 = "374063";
            String bandwidth0 = "0";
            String request1 = "7870529";
            String bandwidth1 = "25M";
            String response = String.format(responseTemp, request0, bandwidth0, request1, bandwidth1);
            HttpEntity entity = new CustomHttpEntity(response, ContentType.create("text/plain", "UTF-8"));
            Mockito.when(mockHttpResponse.getEntity()).thenReturn(entity);

            CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
            long monitorId = 999;
            String app = "testNginx";

            Metrics metrics = new Metrics();
            List<String> aliasField = new ArrayList<>();
            aliasField.add("requests");
            aliasField.add("bandwidth");

            List<Metrics.Field> fields = new ArrayList<>();
            fields.add(Metrics.Field.builder()
                    .field("requests")
                    .type(TYPE_STRING)
                    .build());
            fields.add(Metrics.Field.builder()
                    .field("bandwidth")
                    .type(TYPE_STRING)
                    .build());

            metrics.setAliasFields(aliasField);
            metrics.setFields(fields);
            metrics.setName("req_status");
            metrics.setNginx(nginxProtocol);
            nginxCollect.preCheck(metrics);
            nginxCollect.collect(builder, monitorId, app, metrics);
            assertEquals(builder.getCode(), CollectRep.Code.SUCCESS);
            assertEquals(builder.getValuesCount(), 2);
            for (int i = 0; i < builder.getValuesList().size(); i++) {
                CollectRep.ValueRow row = builder.getValues(i);
                assertEquals(row.getColumnsCount(), 2);
                if (i == 0) {
                    assertEquals(row.getColumns(0), request0);
                    assertEquals(row.getColumns(1), bandwidth0);
                } else {
                    assertEquals(row.getColumns(0), request1);
                    assertEquals(row.getColumns(1), bandwidth1);
                }
            }

        }
    }

    @Test
    void supportProtocol() {
        assertEquals(DispatchConstants.PROTOCOL_NGINX, nginxCollect.supportProtocol());
    }

    static class CustomHttpEntity implements HttpEntity {

        private final String content;
        private final ContentType contentType;

        public CustomHttpEntity(String content, ContentType contentType) {
            this.content = content;
            this.contentType = contentType;
        }

        @Override
        public boolean isRepeatable() {
            return true;
        }

        @Override
        public boolean isChunked() {
            return false;
        }

        @Override
        public boolean isStreaming() {
            return false;
        }

        @Override
        public void consumeContent() {

        }

        @Override
        public long getContentLength() {
            return content.getBytes(contentType.getCharset()).length;
        }

        @Override
        public InputStream getContent() {
            return new ByteArrayInputStream(content.getBytes(contentType.getCharset()));
        }

        @Override
        public void writeTo(OutputStream outStream) throws IOException {
            outStream.write(content.getBytes(contentType.getCharset()));
            outStream.flush();
        }

        @Override
        public Header getContentEncoding() {
            return null;
        }

        @Override
        public Header getContentType() {
            return contentType != null ? new BasicHeader("Content-Type", contentType.toString()) : null;
        }

    }


    @Test
    public void testNginxStatusMatch() {
        String status = """
                Active connections: 2
                server accepts handled requests
                4 4 2
                Reading: 0 Writing: 1 Waiting: 1""";

        // Use regular expressions to match and extract the required keys and corresponding values
        Pattern keyValuePattern = Pattern.compile("(\\w+): (\\d+)");
        Matcher keyValueMatcher = keyValuePattern.matcher(status);

        while (keyValueMatcher.find()) {
            String key = keyValueMatcher.group(1);
            String value = keyValueMatcher.group(2);

            System.out.println(key + ": " + value);
        }

        // Use regular expressions to match and extract the keys and corresponding values for "accepts", "handled", and "requests".
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
        String urlContent = """
                zone_name\tkey\tmax_active\tmax_bw\ttraffic\trequests\tactive\tbandwidth
                server_addr\t172.17.0.3\t2\t 440\t68K\t23\t1\t 0
                server_name\tlocalhost\t2\t 440\t68K\t23\t1\t 0
                server_url\tlocalhost/\t1\t 0\t 0\t4\t0\t 0
                server_url\tlocalhost/index.html\t1\t 104\t27K\t4\t0\t 0
                server_url\tlocalhost/nginx-status\t1\t 32\t 9896\t5\t0\t 0
                server_url\tlocalhost/req-status\t1\t 0\t31K\t10\t1\t 0""";

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
