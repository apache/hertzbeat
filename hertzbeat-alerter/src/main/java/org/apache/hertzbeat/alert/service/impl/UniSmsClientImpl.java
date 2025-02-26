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

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.config.UniSmsProperties;
import org.apache.hertzbeat.alert.service.SmsClient;
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
import com.fasterxml.jackson.databind.JsonNode;
import org.apache.hertzbeat.alert.util.CryptoUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.apache.hertzbeat.common.constants.SmsConstants.UNISMS;

/**
 * UniSMS client implementation <br/>
 * doc:<a href="https://unisms.apistd.com/docs/api/send">https://unisms.apistd.com/docs/api/send</a>
 */
@Slf4j
public class UniSmsClientImpl implements SmsClient {

    private static final String API_URL = "https://uni.apistd.com";
    private static final String ACTION = "sms.message.send";
    private static final String SUCCESS_CODE = "0";
    private static final String HMAC_ALGORITHM = "hmac-sha256";
    
    private final UniSmsProperties config;

    public UniSmsClientImpl(UniSmsProperties config) {
        this.config = config;
    }

    @Override
    public void sendMessage(NoticeReceiver receiver, NoticeTemplate noticeTemplate, GroupAlert alert) {
        try (CloseableHttpClient httpClient = HttpClients.createDefault()) {
            // build request parameters
            Map<String, Object> params = new HashMap<>();
            params.put("to", receiver.getPhone());
            params.put("signature", config.getSignature());
            params.put("templateId", config.getTemplateId());

            // build template data
            Map<String, String> templateData = new HashMap<>();
            String instance = alert.getCommonLabels().getOrDefault("instance", alert.getGroupKey());
            String priority = alert.getCommonLabels().getOrDefault("priority", "unknown");
            String content = alert.getCommonAnnotations().get("summary");
            content = content == null ? alert.getCommonAnnotations().get("description") : content;
            if (content == null) {
                content = alert.getCommonAnnotations().values().stream().findFirst().orElse(null);
            }
            
            templateData.put("instance", instance);
            templateData.put("priority", priority);
            templateData.put("content", content);
            params.put("templateData", templateData);

            // build URL and request headers
            String url;
            if ("hmac".equalsIgnoreCase(config.getAuthMode())) {
                url = buildHmacUrl();
            } else {
                url = buildSimpleUrl();
            }

            // send HTTP request
            HttpPost httpPost = new HttpPost(url);
            httpPost.setHeader("Content-Type", "application/json");
            httpPost.setHeader("Accept", "application/json");
            
            String payload = JsonUtil.toJson(params);
            httpPost.setEntity(new StringEntity(payload, StandardCharsets.UTF_8));

            log.info("Sending SMS request to UniSMS, payload: {}, url: {}", payload, url);

            try (CloseableHttpResponse response = httpClient.execute(httpPost)) {
                handleResponse(response, receiver.getPhone());
            }
        } catch (Exception e) {
            log.error("Failed to send SMS via UniSMS: {}", e.getMessage());
            throw new SendMessageException(e.getMessage());
        }
    }

    private String buildSimpleUrl() {
        return String.format("%s/?action=%s&accessKeyId=%s", 
                API_URL, ACTION, config.getAccessKeyId());
    }

    private String buildHmacUrl() {
        long timestamp = System.currentTimeMillis();
        String nonce = generateNonce();
        
        // build query parameters
        Map<String, String> params = new TreeMap<>();
        params.put("accessKeyId", config.getAccessKeyId());
        params.put("action", ACTION);
        params.put("algorithm", HMAC_ALGORITHM);
        params.put("nonce", nonce);
        params.put("timestamp", String.valueOf(timestamp));

        // build sign text
        String signText = params.entrySet().stream()
                .map(entry -> entry.getKey() + "=" + entry.getValue())
                .collect(Collectors.joining("&"));
        
        // calculate signature
        String signature = CryptoUtils.hmacSha256Base64(config.getAccessKeySecret(), signText);
        return String.format("%s/?action=%s&accessKeyId=%s&algorithm=%s&timestamp=%d&nonce=%s&signature=%s",
                API_URL, ACTION, config.getAccessKeyId(), HMAC_ALGORITHM, timestamp, nonce, signature);
    }

    private String generateNonce() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }

    private void handleResponse(CloseableHttpResponse response, String phone) throws IOException {
        int statusCode = response.getStatusLine().getStatusCode();
        String responseBody = EntityUtils.toString(response.getEntity());
        
        log.info("UniSMS response status: {}, body: {}", statusCode, responseBody);
        
        if (statusCode != 200) {
            throw new SendMessageException("HTTP request failed with status code: " + statusCode + ", response: " + responseBody);
        }
        
        JsonNode jsonResponse = JsonUtil.fromJson(responseBody);
        String code = jsonResponse.get("code").asText();
        if (!SUCCESS_CODE.equals(code)) {
            String message = jsonResponse.get("message").asText();
            throw new SendMessageException(code + ":" + message);
        }
        
        log.info("Successfully sent SMS to phone: {}", phone);
    }

    @Override
    public String getType() {
        return UNISMS;
    }

    @Override
    public boolean checkConfig() {
        if (config == null 
                || config.getAccessKeyId() == null 
                || config.getAccessKeyId().isBlank()
                || config.getSignature() == null 
                || config.getSignature().isBlank()
                || config.getTemplateId() == null 
                || config.getTemplateId().isBlank()) {
            return false;
        }

        // HMAC mode requires additional check for accessKeySecret
        if ("hmac".equalsIgnoreCase(config.getAuthMode()) 
                && (config.getAccessKeySecret() == null || config.getAccessKeySecret().isBlank())) {
            return false;
        }

        return true;
    }
} 