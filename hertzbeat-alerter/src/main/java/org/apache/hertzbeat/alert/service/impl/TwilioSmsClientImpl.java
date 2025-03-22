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

import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.config.TwilioSmsProperties;
import org.apache.hertzbeat.alert.service.SmsClient;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.support.exception.SendMessageException;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.message.BasicNameValuePair;
import org.apache.http.util.EntityUtils;
import org.apache.http.client.entity.UrlEncodedFormEntity;

import java.net.URI;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

import static org.apache.hertzbeat.common.constants.SmsConstants.TWILIO;

/**
 * Twilio SMS Client Implementation<br>
 * API doc: <a href=
 * "https://www.twilio.com/docs/sms/api">https://www.twilio.com/docs/sms/api</a>
 */
@Slf4j
public class TwilioSmsClientImpl implements SmsClient {

    private static final String API_URL_FORMAT = "https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json";
    private static final String MESSAGE_TEMPLATE = "Instance: %s, Priority: %s, Content: %s";

    private final String accountSid;
    private final String authToken;
    private final String twilioPhoneNumber;

    public TwilioSmsClientImpl(TwilioSmsProperties config) {
        if (config != null) {
            this.accountSid = config.getAccountSid();
            this.authToken = config.getAuthToken();
            this.twilioPhoneNumber = config.getTwilioPhoneNumber();
        } else {
            this.accountSid = "";
            this.authToken = "";
            this.twilioPhoneNumber = "";
        }
    }

    @Override
    public void sendMessage(NoticeReceiver receiver, NoticeTemplate noticeTemplate, GroupAlert alert) {
        String instance = null;
        String priority = null;
        String content = null;
        if (alert.getCommonLabels() != null) {
            instance = alert.getCommonLabels().get("instance") == null ? alert.getGroupKey()
                    : alert.getCommonLabels().get("instance");
            priority = alert.getCommonLabels().get("priority") == null ? "unknown"
                    : alert.getCommonLabels().get("priority");
            content = alert.getCommonAnnotations().get("summary");
            content = content == null ? alert.getCommonAnnotations().get("description") : content;
            if (content == null) {
                content = alert.getCommonAnnotations().values().stream().findFirst().orElse(null);
            }
        }
        this.send(receiver.getPhone(), createMessage(instance, priority, content));
    }

    private String createMessage(String instance, String priority, String content) {
        return String.format(MESSAGE_TEMPLATE, instance, priority, content);
    }

    private void send(String phoneNumber, String message) {
        try (CloseableHttpClient httpClient = HttpClients.createDefault()) {
            String endpoint = String.format(API_URL_FORMAT, accountSid);
            URI requestUri = new URI(endpoint);

            HttpPost httpPost = createHttpPost(requestUri, phoneNumber, message);
            log.info("Sending Twilio SMS request to {}", requestUri);
            executeRequest(httpClient, httpPost, phoneNumber);
        } catch (Exception e) {
            log.warn("Failed to send SMS: {}", e.getMessage());
            throw new SendMessageException(e.getMessage());
        }
    }

    private HttpPost createHttpPost(URI requestUri, String toNumber, String message) {
        HttpPost httpPost = new HttpPost(requestUri);

        String auth = accountSid + ":" + authToken;
        String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes());
        httpPost.setHeader("Authorization", "Basic " + encodedAuth);

        List<BasicNameValuePair> parameters = new ArrayList<>();
        parameters.add(new BasicNameValuePair("To", toNumber));
        parameters.add(new BasicNameValuePair("From", twilioPhoneNumber));
        parameters.add(new BasicNameValuePair("Body", message));

        try {
            httpPost.setEntity(new UrlEncodedFormEntity(parameters));
            return httpPost;
        } catch (Exception e) {
            log.error("Failed to create HTTP request: {}", e.getMessage());
            throw new SendMessageException(e.getMessage());
        }
    }

    private void executeRequest(CloseableHttpClient httpClient, HttpPost httpPost, String phoneNumber)
            throws Exception {
        try (CloseableHttpResponse response = httpClient.execute(httpPost)) {
            int statusCode = response.getStatusLine().getStatusCode();
            String responseBody = EntityUtils.toString(response.getEntity());
            log.info("SMS response status: {}, body: {}", statusCode, responseBody);

            if (statusCode < 200 || statusCode >= 300) {

                if (responseBody.contains("21608")) {
                    throw new SendMessageException(
                            "The Twilio trial account can only send SMS to verified phone numbers");
                } else {
                    throw new SendMessageException(
                            "HTTP request failed with status code: " + statusCode + ", response: " + responseBody);
                }
            }

            JsonNode jsonResponse = JsonUtil.fromJson(responseBody);
            if (jsonResponse == null) {
                throw new SendMessageException(statusCode + ":" + responseBody);
            }

            JsonNode sidNode = jsonResponse.get("sid");
            if (sidNode == null) {
                throw new SendMessageException(statusCode + ":" + responseBody);
            }

            String sid = sidNode.asText();
            log.info("Successfully sent SMS to phone: {}, sid: {}", phoneNumber, sid);
        }
    }

    @Override
    public String getType() {
        return TWILIO;
    }

    @Override
    public boolean checkConfig() {
        return !(accountSid.isBlank() || authToken.isBlank() || twilioPhoneNumber.isBlank());
    }
}