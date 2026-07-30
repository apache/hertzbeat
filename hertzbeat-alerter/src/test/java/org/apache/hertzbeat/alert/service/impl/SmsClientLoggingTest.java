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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

import java.util.Map;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.dto.sms.AlibabaSmsProperties;
import org.apache.hertzbeat.common.entity.dto.sms.AwsSmsProperties;
import org.apache.hertzbeat.common.entity.dto.sms.UniSmsProperties;
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

    @Test
    void requestCredentialsAndMessageDataShouldNotBeLogged(CapturedOutput output) throws Exception {
        NoticeReceiver receiver = new NoticeReceiver();
        receiver.setPhone(PHONE);
        GroupAlert alert = new GroupAlert();
        alert.setGroupKey("instance");
        alert.setCommonLabels(Map.of());
        alert.setCommonAnnotations(Map.of("summary", ALERT_CONTENT));

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

        String logs = output.getAll();
        assertFalse(logs.contains(ACCESS_KEY));
        assertFalse(logs.contains(PHONE));
        assertFalse(logs.contains(ALERT_CONTENT));
        assertFalse(logs.contains("Authorization"));
        assertFalse(logs.contains("Signature="));
    }

    private void withSuccessfulResponse(String responseBody, Runnable operation) throws Exception {
        CloseableHttpClient httpClient = mock(CloseableHttpClient.class);
        CloseableHttpResponse response = mock(CloseableHttpResponse.class);
        StatusLine statusLine = mock(StatusLine.class);
        when(statusLine.getStatusCode()).thenReturn(200);
        when(response.getStatusLine()).thenReturn(statusLine);
        when(response.getEntity()).thenReturn(new StringEntity(responseBody, ContentType.APPLICATION_JSON));
        when(httpClient.execute(any(HttpPost.class))).thenReturn(response);

        try (MockedStatic<HttpClients> httpClients = mockStatic(HttpClients.class)) {
            httpClients.when(HttpClients::createDefault).thenReturn(httpClient);
            operation.run();
        }
    }
}
