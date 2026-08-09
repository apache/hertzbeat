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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.Map;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.dto.sms.AlibabaSmsProperties;
import org.apache.hertzbeat.common.entity.dto.sms.AwsSmsProperties;
import org.apache.hertzbeat.common.entity.dto.sms.SmslocalSmsProperties;
import org.apache.hertzbeat.common.entity.dto.sms.TencentSmsProperties;
import org.apache.hertzbeat.common.entity.dto.sms.TwilioSmsProperties;
import org.apache.hertzbeat.common.entity.dto.sms.UniSmsProperties;
import org.apache.hertzbeat.common.support.exception.SendMessageException;
import org.apache.http.StatusLine;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

/**
 * Verifies that SMS clients do not write request credentials or message data to logs.
 */
@ExtendWith(OutputCaptureExtension.class)
class SmsClientLoggingTest {

    private static final String ACCESS_KEY = "access-key-log-sentinel";
    private static final String PHONE = "15555550123";
    private static final String ALERT_CONTENT = "alert-content-log-sentinel";
    private static final String PROVIDER_BODY = "provider-body-log-sentinel";
    private static final String SIGNED_URL = "https://provider.invalid/send?Signature=signed-url-log-sentinel";

    @Test
    void requestCredentialsAndMessageDataShouldNotBeLogged(CapturedOutput output) throws Exception {
        NoticeReceiver receiver = receiver();
        GroupAlert alert = alert();

        AwsSmsProperties awsProperties = new AwsSmsProperties();
        awsProperties.setAccessKeyId(ACCESS_KEY);
        awsProperties.setAccessKeySecret("aws-secret");
        awsProperties.setRegion("us-east-1");
        withSuccessfulResponse("{\"MessageId\":\"message-id\"}",
            () -> new AwsSmsClientImpl(awsProperties).sendMessage(receiver, null, alert));

        AlibabaSmsProperties alibabaProperties =
            new AlibabaSmsProperties(ACCESS_KEY, "alibaba-secret", "sign", "template");
        withSuccessfulResponse("{\"Code\":\"OK\"}",
            () -> new AlibabaSmsClientImpl(alibabaProperties).sendMessage(receiver, null, alert));

        UniSmsProperties uniProperties =
            new UniSmsProperties(ACCESS_KEY, "unisms-secret", "sign", "template", "hmac");
        withSuccessfulResponse("{\"code\":\"0\"}",
            () -> new UniSmsClientImpl(uniProperties).sendMessage(receiver, null, alert));

        withSuccessfulResponse("{\"sid\":\"message-id\"}",
            () -> new TwilioSmsClientImpl(twilioProperties()).sendMessage(receiver, null, alert));

        withSuccessfulResponse("{\"Response\":{\"SendStatusSet\":[{\"Code\":\"Ok\"}]}}",
            () -> new TencentSmsClientImpl(tencentProperties()).sendMessage(receiver, null, alert));

        withSuccessfulResponse("[{\"errorCode\":\"200\",\"id\":\"message-id\"}]",
            () -> new SmsLocalSmsClientImpl(smslocalProperties()).sendMessage(receiver, null, alert));

        String logs = output.getAll();
        assertFalse(logs.contains(ACCESS_KEY));
        assertFalse(logs.contains(PHONE));
        assertFalse(logs.contains(ALERT_CONTENT));
        assertFalse(logs.contains("Authorization"));
        assertFalse(logs.contains("Signature="));
    }

    @Test
    void failedResponsesExposeOnlyProviderAndHttpStatus(CapturedOutput output) throws Exception {
        String body = "{\"message\":\"" + PROVIDER_BODY + "\",\"phone\":\"" + PHONE + "\"}";

        SendMessageException awsFailure = withResponse(503, body,
                () -> new AwsSmsClientImpl(awsProperties()).sendMessage(receiver(), null, alert()));
        SendMessageException alibabaFailure = withResponse(502, body,
                () -> new AlibabaSmsClientImpl(alibabaProperties()).sendMessage(receiver(), null, alert()));
        SendMessageException uniFailure = withResponse(429, body,
                () -> new UniSmsClientImpl(uniProperties()).sendMessage(receiver(), null, alert()));
        SendMessageException twilioFailure = withResponse(429, body,
                () -> new TwilioSmsClientImpl(twilioProperties()).sendMessage(receiver(), null, alert()));
        SendMessageException tencentFailure = withResponse(429, body,
                () -> new TencentSmsClientImpl(tencentProperties()).sendMessage(receiver(), null, alert()));
        SendMessageException smslocalFailure = withResponse(429, body,
                () -> new SmsLocalSmsClientImpl(smslocalProperties()).sendMessage(receiver(), null, alert()));

        assertEquals("AWS SMS request failed with HTTP status 503", awsFailure.getMessage());
        assertEquals("Alibaba Cloud SMS request failed with HTTP status 502", alibabaFailure.getMessage());
        assertEquals("UniSMS request failed with HTTP status 429", uniFailure.getMessage());
        assertEquals("Twilio SMS request failed with HTTP status 429", twilioFailure.getMessage());
        assertEquals("Tencent Cloud SMS request failed with HTTP status 429", tencentFailure.getMessage());
        assertEquals("SMSLocal request failed with HTTP status 429", smslocalFailure.getMessage());
        assertNoSensitiveSentinels(output.getAll()
                + awsFailure.getMessage()
                + alibabaFailure.getMessage()
                + uniFailure.getMessage()
                + twilioFailure.getMessage()
                + tencentFailure.getMessage()
                + smslocalFailure.getMessage());
    }

    @Test
    void providerErrorsDoNotExposeProviderMessages(CapturedOutput output) throws Exception {
        SendMessageException alibabaFailure = withResponse(
                200,
                "{\"Code\":\"THROTTLED\",\"Message\":\"" + PROVIDER_BODY + "\"}",
                () -> new AlibabaSmsClientImpl(alibabaProperties()).sendMessage(receiver(), null, alert()));
        SendMessageException uniFailure = withResponse(
                200,
                "{\"code\":\"RATE_LIMITED\",\"message\":\"" + PROVIDER_BODY + "\"}",
                () -> new UniSmsClientImpl(uniProperties()).sendMessage(receiver(), null, alert()));
        SendMessageException awsFailure = withResponse(
                200,
                "{\"message\":\"" + PROVIDER_BODY + "\"}",
                () -> new AwsSmsClientImpl(awsProperties()).sendMessage(receiver(), null, alert()));
        SendMessageException twilioFailure = withResponse(
                400,
                "{\"code\":21608,\"message\":\"" + PROVIDER_BODY + "\"}",
                () -> new TwilioSmsClientImpl(twilioProperties()).sendMessage(receiver(), null, alert()));
        SendMessageException tencentFailure = withResponse(
                200,
                "{\"Response\":{\"Error\":{\"Code\":\"THROTTLED\",\"Message\":\""
                        + PROVIDER_BODY + "\"}}}",
                () -> new TencentSmsClientImpl(tencentProperties()).sendMessage(receiver(), null, alert()));
        SendMessageException smslocalFailure = withResponse(
                200,
                "[{\"errorCode\":\"RATE_LIMITED\",\"id\":\"" + PROVIDER_BODY + "\"}]",
                () -> new SmsLocalSmsClientImpl(smslocalProperties()).sendMessage(receiver(), null, alert()));

        assertEquals("Alibaba Cloud SMS request failed (code: THROTTLED)", alibabaFailure.getMessage());
        assertEquals("UniSMS request failed (code: RATE_LIMITED)", uniFailure.getMessage());
        assertEquals("AWS SMS provider returned an invalid response", awsFailure.getMessage());
        assertEquals("Twilio SMS request failed (code: 21608)", twilioFailure.getMessage());
        assertEquals("Tencent Cloud SMS request failed (code: THROTTLED)", tencentFailure.getMessage());
        assertEquals("SMSLocal request failed (code: RATE_LIMITED)", smslocalFailure.getMessage());
        assertNoSensitiveSentinels(output.getAll()
                + alibabaFailure.getMessage()
                + uniFailure.getMessage()
                + awsFailure.getMessage()
                + twilioFailure.getMessage()
                + tencentFailure.getMessage()
                + smslocalFailure.getMessage());
    }

    @Test
    void networkExceptionsDoNotExposeSignedUrls(CapturedOutput output) throws Exception {
        SendMessageException awsFailure = withNetworkFailure(
                () -> new AwsSmsClientImpl(awsProperties()).sendMessage(receiver(), null, alert()));
        SendMessageException alibabaFailure = withNetworkFailure(
                () -> new AlibabaSmsClientImpl(alibabaProperties()).sendMessage(receiver(), null, alert()));
        SendMessageException uniFailure = withNetworkFailure(
                () -> new UniSmsClientImpl(uniProperties()).sendMessage(receiver(), null, alert()));
        SendMessageException twilioFailure = withNetworkFailure(
                () -> new TwilioSmsClientImpl(twilioProperties()).sendMessage(receiver(), null, alert()));
        SendMessageException tencentFailure = withNetworkFailure(
                () -> new TencentSmsClientImpl(tencentProperties()).sendMessage(receiver(), null, alert()));
        SendMessageException smslocalFailure = withNetworkFailure(
                () -> new SmsLocalSmsClientImpl(smslocalProperties()).sendMessage(receiver(), null, alert()));

        assertEquals("AWS SMS request failed", awsFailure.getMessage());
        assertEquals("Alibaba Cloud SMS request failed", alibabaFailure.getMessage());
        assertEquals("UniSMS request failed", uniFailure.getMessage());
        assertEquals("Twilio SMS request failed", twilioFailure.getMessage());
        assertEquals("Tencent Cloud SMS request failed", tencentFailure.getMessage());
        assertEquals("SMSLocal request failed", smslocalFailure.getMessage());
        assertNoSensitiveSentinels(output.getAll()
                + awsFailure.getMessage()
                + alibabaFailure.getMessage()
                + uniFailure.getMessage()
                + twilioFailure.getMessage()
                + tencentFailure.getMessage()
                + smslocalFailure.getMessage());
    }

    private void withSuccessfulResponse(String responseBody, Runnable operation) throws Exception {
        withResponse(200, responseBody, operation, false);
    }

    private SendMessageException withResponse(int statusCode, String responseBody, Runnable operation)
            throws Exception {
        return withResponse(statusCode, responseBody, operation, true);
    }

    private SendMessageException withResponse(
            int statusCode,
            String responseBody,
            Runnable operation,
            boolean expectsFailure) throws Exception {
        CloseableHttpClient httpClient = mock(CloseableHttpClient.class);
        CloseableHttpResponse response = mock(CloseableHttpResponse.class);
        StatusLine statusLine = mock(StatusLine.class);
        when(statusLine.getStatusCode()).thenReturn(statusCode);
        when(response.getStatusLine()).thenReturn(statusLine);
        when(response.getEntity()).thenReturn(new StringEntity(responseBody, ContentType.APPLICATION_JSON));
        when(httpClient.execute(any(HttpPost.class))).thenReturn(response);

        try (MockedStatic<HttpClients> httpClients = mockStatic(HttpClients.class)) {
            httpClients.when(HttpClients::createDefault).thenReturn(httpClient);
            if (expectsFailure) {
                return assertThrows(SendMessageException.class, operation::run);
            }
            operation.run();
            return null;
        }
    }

    private SendMessageException withNetworkFailure(Runnable operation) throws Exception {
        CloseableHttpClient httpClient = mock(CloseableHttpClient.class);
        when(httpClient.execute(any(HttpPost.class)))
                .thenThrow(new IOException(SIGNED_URL + "&phone=" + PHONE + "&body=" + PROVIDER_BODY));
        try (MockedStatic<HttpClients> httpClients = mockStatic(HttpClients.class)) {
            httpClients.when(HttpClients::createDefault).thenReturn(httpClient);
            return assertThrows(SendMessageException.class, operation::run);
        }
    }

    private NoticeReceiver receiver() {
        NoticeReceiver receiver = new NoticeReceiver();
        receiver.setPhone(PHONE);
        return receiver;
    }

    private GroupAlert alert() {
        GroupAlert alert = new GroupAlert();
        alert.setGroupKey("instance");
        alert.setCommonLabels(Map.of());
        alert.setCommonAnnotations(Map.of("summary", ALERT_CONTENT, "description", ALERT_CONTENT));
        return alert;
    }

    private AwsSmsProperties awsProperties() {
        AwsSmsProperties properties = new AwsSmsProperties();
        properties.setAccessKeyId(ACCESS_KEY);
        properties.setAccessKeySecret("aws-secret");
        properties.setRegion("us-east-1");
        return properties;
    }

    private AlibabaSmsProperties alibabaProperties() {
        return new AlibabaSmsProperties(ACCESS_KEY, "alibaba-secret", "sign", "template");
    }

    private UniSmsProperties uniProperties() {
        return new UniSmsProperties(ACCESS_KEY, "unisms-secret", "sign", "template", "hmac");
    }

    private TwilioSmsProperties twilioProperties() {
        return new TwilioSmsProperties(ACCESS_KEY, "twilio-secret", "twilio-phone");
    }

    private TencentSmsProperties tencentProperties() {
        return new TencentSmsProperties(ACCESS_KEY, "tencent-secret", "app-id", "sign", "template");
    }

    private SmslocalSmsProperties smslocalProperties() {
        return new SmslocalSmsProperties(ACCESS_KEY);
    }

    private void assertNoSensitiveSentinels(String text) {
        assertFalse(text.contains(ACCESS_KEY));
        assertFalse(text.contains(PHONE));
        assertFalse(text.contains(ALERT_CONTENT));
        assertFalse(text.contains(PROVIDER_BODY));
        assertFalse(text.contains(SIGNED_URL));
        assertFalse(text.contains("signed-url-log-sentinel"));
    }
}
