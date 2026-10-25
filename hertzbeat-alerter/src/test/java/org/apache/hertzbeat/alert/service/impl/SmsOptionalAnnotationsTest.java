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

package org.apache.hertzbeat.alert.service.impl;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Stream;
import org.apache.hertzbeat.alert.service.SmsClient;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.dto.sms.AwsSmsProperties;
import org.apache.hertzbeat.common.entity.dto.sms.SmslocalSmsProperties;
import org.apache.hertzbeat.common.entity.dto.sms.TencentSmsProperties;
import org.apache.hertzbeat.common.entity.dto.sms.TwilioSmsProperties;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.http.ProtocolVersion;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.message.BasicStatusLine;
import org.apache.http.util.EntityUtils;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class SmsOptionalAnnotationsTest {

    static Stream<Arguments> clients() {
        AwsSmsProperties aws = new AwsSmsProperties();
        aws.setAccessKeyId("fixture-id");
        aws.setAccessKeySecret("fixture-secret");
        aws.setRegion("fixture-region");
        TencentSmsProperties tencent = new TencentSmsProperties();
        tencent.setSecretId("fixture-id");
        tencent.setSecretKey("fixture-secret");
        tencent.setAppId("fixture-app");
        tencent.setSignName("fixture-sign");
        tencent.setTemplateId("fixture-template");
        TwilioSmsProperties twilio = new TwilioSmsProperties();
        twilio.setAccountSid("fixture-id");
        twilio.setAuthToken("fixture-token");
        twilio.setTwilioPhoneNumber("fixture-from");
        SmslocalSmsProperties local = new SmslocalSmsProperties();
        local.setApiKey("fixture-token");
        return Stream.of(
                Arguments.of(new AwsSmsClientImpl(aws), "{\"MessageId\":\"fixture\"}"),
                Arguments.of(new TencentSmsClientImpl(tencent), "{\"Response\":{\"SendStatusSet\":[{\"Code\":\"Ok\"}]}}"),
                Arguments.of(new TwilioSmsClientImpl(twilio), "{\"sid\":\"fixture\"}"),
                Arguments.of(new SmsLocalSmsClientImpl(local), "[{\"errorCode\":\"200\"}]"));
    }

    @ParameterizedTest
    @MethodSource("clients")
    void sendsWithoutAnnotations(SmsClient client, String responseBody) throws Exception {
        send(client, responseBody, null, "");
    }

    @ParameterizedTest
    @MethodSource("clients")
    void sendsWithEmptyAnnotations(SmsClient client, String responseBody) throws Exception {
        send(client, responseBody, Map.of(), "");
    }

    @ParameterizedTest
    @MethodSource("clients")
    void preservesDescriptionOrExistingLocalFallback(SmsClient client, String responseBody) throws Exception {
        send(client, responseBody, Map.of("description", "description"),
                client instanceof SmsLocalSmsClientImpl ? "fallback-content" : "description");
    }

    @ParameterizedTest
    @MethodSource("clients")
    void preservesSummaryWithDescriptionPresent(SmsClient client, String responseBody) throws Exception {
        send(client, responseBody, Map.of("summary", "preferred-summary", "description", "description"), "preferred-summary");
    }

    static Stream<Arguments> missingLocalContent() {
        return Stream.of(
                Arguments.of(null, null), Arguments.of(null, List.of()),
                Arguments.of(Map.of(), null), Arguments.of(Map.of(), List.of()),
                Arguments.of(null, Collections.singletonList(null)),
                Arguments.of(Map.of(), Collections.singletonList(null)));
    }

    @ParameterizedTest
    @MethodSource("missingLocalContent")
    void localMissingAnnotationsAndFallbackHaveNoInventedContent(Map<String, String> annotations, List<SingleAlert> alerts)
            throws Exception {
        SmslocalSmsProperties config = new SmslocalSmsProperties();
        config.setApiKey("fixture-token");
        String payload = send(new SmsLocalSmsClientImpl(config), "[{\"errorCode\":\"200\"}]", annotations, "", alerts);
        assertEquals("fixture-destination", JsonUtil.fromJson(payload).get("to").asText());
        var content = JsonUtil.fromJson(payload).get("content");
        assertTrue(content == null || content.isNull());
    }

    private void send(SmsClient client, String responseBody, Map<String, String> annotations, String expected) throws Exception {
        SingleAlert single = new SingleAlert();
        single.setContent("fallback-content");
        send(client, responseBody, annotations, expected, List.of(single));
    }

    private String send(SmsClient client, String responseBody, Map<String, String> annotations, String expected,
                        List<SingleAlert> alerts) throws Exception {
        NoticeReceiver receiver = new NoticeReceiver();
        receiver.setPhone("fixture-destination");
        GroupAlert alert = new GroupAlert();
        alert.setGroupKey("fixture-group");
        alert.setCommonLabels(Map.of("instance", "fixture-instance", "priority", "warning"));
        alert.setCommonAnnotations(annotations);
        alert.setAlerts(alerts);
        CloseableHttpClient transport = mock(CloseableHttpClient.class);
        CloseableHttpResponse response = mock(CloseableHttpResponse.class);
        when(response.getStatusLine()).thenReturn(new BasicStatusLine(new ProtocolVersion("HTTP", 1, 1), 200, "OK"));
        when(response.getEntity()).thenReturn(new StringEntity(responseBody));
        AtomicReference<String> body = new AtomicReference<>();
        when(transport.execute(any(HttpPost.class))).thenAnswer(invocation -> {
            body.set(EntityUtils.toString(((HttpPost) invocation.getArgument(0)).getEntity()));
            return response;
        });
        // All provider requests terminate in this fixture; no real SMS or external network.
        try (var factory = mockStatic(HttpClients.class)) {
            factory.when(HttpClients::createDefault).thenReturn(transport);
            assertDoesNotThrow(() -> client.sendMessage(receiver, null, alert));
        }
        assertTrue(body.get() != null && body.get().contains(expected));
        if (client instanceof SmsLocalSmsClientImpl && annotations == null && alerts != null && !alerts.isEmpty()
                && alerts.get(0) != null) {
            assertTrue(body.get().contains("fallback-content"));
        }
        return body.get();
    }
}
