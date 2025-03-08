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
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.config.AwsSmsProperties;
import org.apache.hertzbeat.alert.service.SmsClient;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.support.exception.SendMessageException;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

import static org.apache.hertzbeat.common.constants.SmsConstants.AWS;

/**
 * AWS Cloud SMS Client Implementation<br>
 * API doc: </a><br>
 * Singnature doc: <a </a>
 */
@Slf4j
public class AwsSmsClientImpl implements SmsClient {


    private static final String SERVICE = "sms-voice";
    private static final String MESSAGE_TEMPLATE = "Instance: %s, Priority: %s, Content: %s";

    private final String accessKey;
    private final String secretKey;
    private final String region;

    public AwsSmsClientImpl(AwsSmsProperties config) {
        if (config != null) {
            this.accessKey = config.getAccessKeyId();
            this.secretKey = config.getAccessKeySecret();
            this.region = config.getRegion();
        } else {
            this.accessKey = "";
            this.secretKey = "";
            this.region = "";
        }
    }

    @Override
    public void sendMessage(NoticeReceiver receiver, NoticeTemplate noticeTemplate, GroupAlert alert) {
        // Extract alert info
        String instance = null;
        String priority = null;
        String content = null;
        if (alert.getCommonLabels() != null) {
            instance = alert.getCommonLabels().get("instance") == null ? alert.getGroupKey() : alert.getCommonLabels().get("instance");
            priority = alert.getCommonLabels().get("priority") == null ? "unknown" : alert.getCommonLabels().get("priority");
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
        Map<String, Object> payload = new HashMap<>();
        payload.put("MessageBody", message);
        payload.put("DestinationPhoneNumber", phoneNumber);
        payload.put("MessageType", "TRANSACTIONAL");
        Instant now = Instant.now();
        String endpoint = "https://" + SERVICE + "." + region + ".amazonaws.com/?";
        String amzDate = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC).format(now);
        try (CloseableHttpClient httpClient = HttpClients.createDefault()) {
            String payloadInString = new ObjectMapper().writeValueAsString(payload);
            URI requestUri = new URI(endpoint);
            String authorizationHeader = new AwsAuthenticationBuilder()
                    .credential(this.accessKey, this.secretKey)
                    .region(this.region)
                    .header("content-type", "application/x-amz-json-1.0")
                    .header("host", SERVICE + "." + this.region + ".amazonaws.com")
                    .header("x-amz-date", amzDate)
                    .header("x-amz-target", "PinpointSMSVoiceV2.SendTextMessage")
                    .build(requestUri, "POST", SERVICE, payloadInString);


            HttpPost httpPost = new HttpPost(requestUri);
            httpPost.setHeader("Authorization", authorizationHeader);
            httpPost.setHeader("content-type", "application/x-amz-json-1.0");
            httpPost.setHeader("x-amz-date", amzDate);
            httpPost.setHeader("x-amz-target", "PinpointSMSVoiceV2.SendTextMessage");
            httpPost.setEntity(
                    new StringEntity(payloadInString, ContentType.APPLICATION_JSON));
            log.info("Sending AWS SMS request to {}", requestUri + "," + "headers: " + Arrays.toString(httpPost.getAllHeaders()));

            try (CloseableHttpResponse response = httpClient.execute(httpPost)) {
                int statusCode = response.getStatusLine().getStatusCode();
                String responseBody = EntityUtils.toString(response.getEntity());
                log.info("SMS response status: {}, body: {}", statusCode, responseBody);
                if (statusCode != 200) {
                    throw new SendMessageException("HTTP request failed with status code: " + statusCode + ", response: " + responseBody);
                }

                JsonNode jsonResponse = JsonUtil.fromJson(responseBody);
                if (jsonResponse == null) {
                    throw new SendMessageException(statusCode + ":" + responseBody);
                }
                JsonNode responseNode = jsonResponse.get("MessageId");
                if (responseNode == null) {
                    throw new SendMessageException(statusCode + ":" + responseBody);
                }
                String messageId = responseNode.asText();
                log.info("Successfully sent SMS to phone: {}, messageId: {}", phoneNumber, messageId);
            }
        } catch (Exception e) {
            log.warn("Failed to send SMS: {}", e.getMessage());
            throw new SendMessageException(e.getMessage());
        }
    }

    @Override
    public String getType() {
        return AWS;
    }

    @Override
    public boolean checkConfig() {
        return !(accessKey.isBlank() || secretKey.isBlank() || region.isBlank());
    }


    private static class AwsAuthenticationBuilder {
        private String accessKey;
        private String secretKey;
        private String region;
        private String service;
        private URI requestUri;
        private String method;
        private String payload;
        private final Map<String, String> headers = new LinkedHashMap<String, String>();

        public AwsAuthenticationBuilder region(String region) {
            this.region = region;
            return this;
        }

        public AwsAuthenticationBuilder credential(String accessKey, String secretKey) {
            this.accessKey = accessKey;
            this.secretKey = secretKey;
            return this;
        }

        public AwsAuthenticationBuilder header(String header, String value) {
            this.headers.put(header, value);
            return this;
        }

        public String build(URI requestUri, String method, String service, String payload) throws Exception {
            this.requestUri = requestUri;
            this.method = method;
            this.service = service;
            this.payload = payload;
            return "%s Credential=%s/%s, SignedHeaders=%s, Signature=%s".formatted(getAlgorithm(), this.accessKey, getCredentialScope(), getSignedHeaders(), getSignature());
        }

        private String getCredentialScope() {
            return this.getDateStamp() + "/" + this.region + "/" + this.service + "/aws4_request";
        }

        private String getSignedHeaders() {
            return String.join(";", this.headers.keySet());
        }

        private String getDateTime() {
            return this.headers.get("x-amz-date");
        }

        private String getDateStamp() {
            return this.getDateTime().substring(0, 8);
        }

        private String getSignature() throws Exception {
            String canonicalRequest = this.getCanonicalRequest();
            String stringToSign = "AWS4-HMAC-SHA256\n" + this.getDateTime() + "\n" + this.getCredentialScope() + "\n" + sha256Hash(canonicalRequest);
            byte[] signingKey = getSignatureKey(this.secretKey, this.getDateStamp(), this.region, this.service);
            return bytesToHex(hmacSHA256(signingKey, stringToSign));
        }

        public String getCanonicalRequest() throws Exception {
            return "%s\n%s\n%s\n%s\n%s\n%s".formatted(this.method, this.requestUri.getPath(), this.requestUri.getQuery(), this.getCanonicalHeaders(), this.getSignedHeaders(), sha256Hash(this.payload));
        }

        private String getCanonicalHeaders() {
            return new StringBuilder().append(this.headers.entrySet().stream()
                    .map(entry -> entry.getKey() + ":" + entry.getValue())
                    .collect(Collectors.joining("\n"))).append("\n").toString();
        }

        private String getAlgorithm() {
            return "AWS4-HMAC-SHA256";
        }

        private static String sha256Hash(String text) throws Exception {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(text.getBytes(StandardCharsets.UTF_8));
            return bytesToHex(hash);
        }

        private static byte[] hmacSHA256(byte[] key, String data) throws Exception {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(key, "HmacSHA256");
            mac.init(secretKeySpec);
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        }

        private static byte[] getSignatureKey(String key, String dateStamp, String regionName, String serviceName) throws Exception {
            byte[] kDate = hmacSHA256(("AWS4" + key).getBytes(StandardCharsets.UTF_8), dateStamp);
            byte[] kRegion = hmacSHA256(kDate, regionName);
            byte[] kService = hmacSHA256(kRegion, serviceName);
            return hmacSHA256(kService, "aws4_request");
        }

        private static String bytesToHex(byte[] bytes) {
            StringBuilder hexString = new StringBuilder();
            for (byte b : bytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        }
    }
}


