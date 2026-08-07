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

import tools.jackson.databind.JsonNode;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.dto.sms.SmslocalSmsProperties;
import org.apache.hertzbeat.alert.service.SmsClient;
import org.apache.hertzbeat.common.constants.SmsConstants;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.support.exception.SendMessageException;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;

import java.nio.charset.StandardCharsets;
import java.util.Objects;

/**
 * Smslocal SMS Client Implement
 */
@Slf4j
public class SmsLocalSmsClientImpl implements SmsClient {
    private static final String HOST = "secure.smslocal.com";

    private static final String PATH = "/api/service/enterprise-service/external/sms";

    private static final String FROM = "Hertzbeat";

    private static final String SUCCESS_CODE = "200";

    private final SmslocalSmsProperties config;

    public SmsLocalSmsClientImpl(SmslocalSmsProperties smslocalSmsProperties) {
        this.config = smslocalSmsProperties;
    }

    @Override
    public void sendMessage(NoticeReceiver receiver, NoticeTemplate noticeTemplate, GroupAlert alert) {
        if (Objects.isNull(receiver) || Objects.isNull(alert)) {
            log.warn("SMSLocal receiver and alert cannot be null");
            return;
        }

        try (CloseableHttpClient httpClient = HttpClients.createDefault()) {
            String content = alert.getCommonAnnotations().get("summary");
            if (Objects.isNull(content) || Objects.isNull(alert.getCommonAnnotations().get("description"))) {
                content = alert.getAlerts().get(0).getContent();
            }
            SmsMessage smsMessage = new SmsMessage(FROM, receiver.getPhone(), content);

            String payload = JsonUtil.toJson(smsMessage);

            HttpPost httpPost = new HttpPost("https://" + HOST + PATH);
            httpPost.setHeader("Content-Type", "application/json; charset=utf-8");
            httpPost.setHeader("Token", config.getApiKey());
            httpPost.setEntity(new StringEntity(payload, StandardCharsets.UTF_8));

            log.debug("Sending SMS request via SMSLocal");

            // send http request and handle response
            try (CloseableHttpResponse response = httpClient.execute(httpPost)) {
                int statusCode = response.getStatusLine().getStatusCode();
                String responseBody = EntityUtils.toString(response.getEntity());

                log.debug("SMSLocal response status: {}", statusCode);

                if (statusCode != 200) {
                    throw SmsFailureMessages.httpStatus("SMSLocal", statusCode);
                }

                JsonNode jsonResponse = JsonUtil.fromJson(responseBody);
                if (jsonResponse == null || !jsonResponse.isArray() || jsonResponse.isEmpty()) {
                    throw SmsFailureMessages.invalidResponse("SMSLocal");
                }
                JsonNode jsonNode = jsonResponse.get(0);
                JsonNode errorCodeNode = jsonNode.get("errorCode");
                if (errorCodeNode == null) {
                    throw SmsFailureMessages.invalidResponse("SMSLocal");
                }
                String errorCode = errorCodeNode.asText();
                if (!SUCCESS_CODE.equals(errorCode)) {
                    throw SmsFailureMessages.providerCode("SMSLocal", errorCode);
                }

                log.info("Successfully sent SMS via SMSLocal");
            }
        } catch (SendMessageException e) {
            log.warn("Failed to send SMS via SMSLocal");
            throw e;
        } catch (Exception e) {
            log.warn("Failed to send SMS via SMSLocal, failure type: {}",
                    e.getClass().getSimpleName());
            throw SmsFailureMessages.requestFailed("SMSLocal");
        }

    }

    @Override
    public String getType() {
        return SmsConstants.SMSLOCAL;
    }

    @Override
    public boolean checkConfig() {
        if (Objects.isNull(config) || Objects.isNull(config.getApiKey()) || config.getApiKey().isBlank()) {
            log.warn("SMSLocal properties cannot be null or blank");
            return false;
        }
        return true;
    }

    @Getter
    @Setter
    private static class SmsMessage {
        String from;
        String to;
        String content;
        final int datacoding = 0;
        final String direction = "mt";

        public SmsMessage(String from, String to, String content) {
            this.from = from;
            this.to = to;
            this.content = content;
        }
    }

}
