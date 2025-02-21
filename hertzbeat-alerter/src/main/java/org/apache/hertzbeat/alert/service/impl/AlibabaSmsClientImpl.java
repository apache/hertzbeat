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
import org.apache.hertzbeat.alert.config.AlibabaSmsProperties;
import org.apache.hertzbeat.alert.service.SmsClient;
import org.apache.hertzbeat.alert.util.CryptoUtils;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.support.exception.SendMessageException;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;

import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.SimpleTimeZone;
import java.util.TreeMap;
import java.util.UUID;

import static org.apache.hertzbeat.common.constants.SmsConstants.ALIBABA;

/**
 * Alibaba Cloud SMS Client Implementation<br>
 * API doc: <a href="https://next.api.aliyun.com/document/Dysmsapi/2017-05-25/SendSms">https://next.api.aliyun.com/document/Dysmsapi/2017-05-25/SendSms</a><br>
 * Singnature doc: <a href="https://help.aliyun.com/zh/sdk/product-overview/v3-request-structure-and-signature">https://help.aliyun.com/zh/sdk/product-overview/v3-request-structure-and-signature</a>
 */
@Slf4j
public class AlibabaSmsClientImpl implements SmsClient {

    private static final String API_VERSION = "2017-05-25";
    private static final String ACTION = "SendSms";
    private static final String HOST = "dysmsapi.aliyuncs.com";
    private static final String ALGORITHM = "ACS3-HMAC-SHA256";
    
    private final String accessKeyId;
    private final String accessKeySecret;
    private final String signName;
    private final String templateCode;

    public AlibabaSmsClientImpl(AlibabaSmsProperties config) {
        if (config != null) {
            this.accessKeyId = config.getAccessKeyId();
            this.accessKeySecret = config.getAccessKeySecret();
            this.signName = config.getSignName();
            this.templateCode = config.getTemplateCode();
        } else {
            this.accessKeyId = "";
            this.accessKeySecret = "";
            this.signName = "";
            this.templateCode = "";
        }
    }

    @Override
    public void sendMessage(NoticeReceiver receiver, NoticeTemplate noticeTemplate, GroupAlert alert) {
        // Extract alert info
        String instance = null;
        String priority = null;
        String content = null;
        if (alert.getCommonLabels() != null) {
            instance = alert.getCommonLabels().get("instance");
            priority = alert.getCommonLabels().get("priority");
            content = alert.getCommonAnnotations().get("summary");
            content = content == null ? alert.getCommonAnnotations().get("description") : content;
            if (content == null) {
                content = alert.getCommonAnnotations().values().stream().findFirst().orElse(null);
            }
        }

        // Build template parameters
        Map<String, String> templateParam = new HashMap<>();
        templateParam.put("instance", instance == null ? alert.getGroupKey() : instance);
        templateParam.put("priority", priority == null ? "unknown" : priority);
        templateParam.put("content", content);

        sendSms(receiver.getPhone(), JsonUtil.toJson(templateParam));
    }

    private void sendSms(String phoneNumber, String templateParam) {
        try (CloseableHttpClient httpClient = HttpClients.createDefault()) {
            // Build query parameters
            Map<String, String> queryParams = new TreeMap<>();
            queryParams.put("PhoneNumbers", phoneNumber);
            queryParams.put("SignName", signName);
            queryParams.put("TemplateCode", templateCode);
            queryParams.put("TemplateParam", templateParam);

            // Build canonical query string
            StringBuilder canonicalQueryString = new StringBuilder();
            queryParams.forEach((key, value) -> {
                if (canonicalQueryString.length() > 0) {
                    canonicalQueryString.append("&");
                }
                canonicalQueryString.append(percentEncode(key))
                        .append("=")
                        .append(percentEncode(value));
            });

            // Generate timestamp and nonce
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'");
            sdf.setTimeZone(new SimpleTimeZone(0, "GMT"));
            String timestamp = sdf.format(new Date());
            String nonce = UUID.randomUUID().toString();

            // Calculate signature
            String authorization = calculateAuthorization(
                    canonicalQueryString.toString(),
                    timestamp,
                    nonce
            );

            // Build URL
            String url = "https://" + HOST + "/?" + canonicalQueryString;

            // Build HTTP request
            HttpPost httpPost = new HttpPost(url);
            httpPost.setHeader("Content-Type", "application/json");
            httpPost.setHeader("Host", HOST);
            httpPost.setHeader("Authorization", authorization);
            httpPost.setHeader("x-acs-action", ACTION);
            httpPost.setHeader("x-acs-version", API_VERSION);
            httpPost.setHeader("x-acs-date", timestamp);
            httpPost.setHeader("x-acs-signature-nonce", nonce);
            httpPost.setHeader("x-acs-content-sha256", 
                    CryptoUtils.sha256Hex(""));

            log.info("Sending Alibaba SMS request to {}", url + ", params: " + templateParam + "headers: " + Arrays.toString(httpPost.getAllHeaders()));

            // Send request and handle response
            try (CloseableHttpResponse response = httpClient.execute(httpPost)) {
                int statusCode = response.getStatusLine().getStatusCode();
                String responseBody = EntityUtils.toString(response.getEntity());

                log.info("SMS response status: {}, body: {}", statusCode, responseBody);

                if (statusCode != 200) {
                    throw new SendMessageException("HTTP request failed with status code: " + statusCode + ", response: " + responseBody);
                }

                JsonNode jsonResponse = JsonUtil.fromJson(responseBody);
                String code = jsonResponse.get("Code").asText();
                if (!"OK".equals(code)) {
                    String message = jsonResponse.get("Message").asText();
                    throw new SendMessageException(code + ":" + message);
                }

                log.info("Successfully sent SMS to phone: {}", phoneNumber);
            }
        } catch (Exception e) {
            log.warn("Failed to send SMS: {}", e.getMessage());
            throw new SendMessageException(e.getMessage());
        }
    }

    private String calculateAuthorization(String canonicalQueryString, String timestamp, String nonce) {
        try {
            // Step 1: Build canonical request
            String canonicalRequest = buildCanonicalRequest(canonicalQueryString, timestamp, nonce);

            // Step 2: Build string to sign
            String stringToSign = ALGORITHM + "\n" + CryptoUtils.sha256Hex(canonicalRequest);

            // Step 3: Calculate signature
            String signature = CryptoUtils.hmacSha256Hex(accessKeySecret, stringToSign);

            // Step 4: Build authorization header
            return ALGORITHM + " Credential=" + accessKeyId + ",SignedHeaders=host;x-acs-action;x-acs-content-sha256;x-acs-date;" + "x-acs-signature-nonce;x-acs-version,Signature=" + signature;
        } catch (Exception e) {
            throw new RuntimeException("Failed to calculate authorization", e);
        }
    }

    private String buildCanonicalRequest(String canonicalQueryString, String timestamp, String nonce) {
        return "POST\n"
                + "/\n"
                + canonicalQueryString + "\n"
                + "host:" + HOST + "\n"
                + "x-acs-action:" + ACTION + "\n"
                + "x-acs-content-sha256:" + CryptoUtils.sha256Hex("") + "\n"
                + "x-acs-date:" + timestamp + "\n"
                + "x-acs-signature-nonce:" + nonce + "\n"
                + "x-acs-version:" + API_VERSION + "\n\n"
                + "host;x-acs-action;x-acs-content-sha256;x-acs-date;"
                + "x-acs-signature-nonce;x-acs-version\n"
                + CryptoUtils.sha256Hex("");
    }

    private String percentEncode(String value) {
        try {
            return java.net.URLEncoder.encode(value, StandardCharsets.UTF_8)
                    .replace("+", "%20")
                    .replace("*", "%2A")
                    .replace("%7E", "~");
        } catch (Exception e) {
            throw new RuntimeException("Failed to encode value", e);
        }
    }

    @Override
    public String getType() {
        return ALIBABA;
    }

    @Override
    public boolean checkConfig() {
        return !(accessKeyId.isBlank() || accessKeySecret.isBlank() || signName.isBlank() || templateCode.isBlank());
    }
} 