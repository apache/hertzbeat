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
import org.apache.hertzbeat.alert.util.CryptoUtils;
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
 * API doc:<a href="https://docs.aws.amazon.com/pinpoint/latest/apireference_smsvoicev2/API_SendTextMessage.html">https://docs.aws.amazon.com/pinpoint/latest/apireference_smsvoicev2/API_SendTextMessage.html</a><br>
 * Signature doc:<a href="https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv-create-signed-request.html"</a>https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv-create-signed-request.html</a>
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
        String amzDate = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC).format(now);
        String endpoint = "https://" + SERVICE + "." + region + ".amazonaws.com";

        try (CloseableHttpClient httpClient = HttpClients.createDefault()) {
            String payloadInString = new ObjectMapper().writeValueAsString(payload);
            URI requestUri = new URI(endpoint);

            HttpPost httpPost = createHttpPost(requestUri, amzDate, payloadInString);
            log.info("Sending AWS SMS request to {}", requestUri + "," + "headers: " + Arrays.toString(httpPost.getAllHeaders()));
            executeRequest(httpClient, httpPost, phoneNumber);
        } catch (Exception e) {
            log.warn("Failed to send SMS: {}", e.getMessage());
            throw new SendMessageException(e.getMessage());
        }
    }


    private HttpPost createHttpPost(URI requestUri, String amzDate, String payloadInString) throws Exception {
        // Define headers once to avoid repetition (Order of headers must be maintained)
        Map<String, String> headers = new LinkedHashMap<>();
        headers.put("content-type", "application/x-amz-json-1.0");
        headers.put("host", SERVICE + "." + this.region + ".amazonaws.com");
        headers.put("x-amz-date", amzDate);
        headers.put("x-amz-target", "PinpointSMSVoiceV2.SendTextMessage");

        // Build authorization header using the same headers
        AwsAuthenticationBuilder authBuilder = new AwsAuthenticationBuilder()
                .credential(this.accessKey, this.secretKey)
                .region(this.region);
        headers.forEach(authBuilder::header);
        String authorizationHeader = authBuilder.build(requestUri, "POST", SERVICE, payloadInString);

        // Create HTTP post and set all headers
        HttpPost httpPost = new HttpPost(requestUri);
        httpPost.setHeader("Authorization", authorizationHeader);
        headers.forEach(httpPost::setHeader);

        httpPost.setEntity(new StringEntity(payloadInString, ContentType.APPLICATION_JSON));
        return httpPost;
    }

    private void executeRequest(CloseableHttpClient httpClient, HttpPost httpPost, String phoneNumber) throws Exception {
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
        private final Map<String, String> headers = new LinkedHashMap<>();

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
            return "%s Credential=%s/%s, SignedHeaders=%s, Signature=%s".formatted(
                    getAlgorithm(),
                    this.accessKey,
                    getCredentialScope(),
                    getSignedHeaders(),
                    getSignature()
            );
        }

        private String getCredentialScope() {
            return getDateStamp() + "/" + region + "/" + service + "/aws4_request";
        }

        private String getSignedHeaders() {
            return String.join(";", headers.keySet());
        }

        private String getDateTime() {
            return headers.get("x-amz-date");
        }

        private String getDateStamp() {
            return getDateTime().substring(0, 8);
        }

        private String getSignature() {
            String canonicalRequest = getCanonicalRequest();
            String stringToSign = String.join("\n",
                    getAlgorithm(),
                    getDateTime(),
                    getCredentialScope(),
                    CryptoUtils.sha256Hex(canonicalRequest));

            byte[] signingKey = getSignatureKey(secretKey, getDateStamp(), region, service);
            return CryptoUtils.hmacSha256Hex(signingKey, stringToSign);
        }

        private String getCanonicalRequest() {
            return String.join("\n",
                    method,
                    requestUri.getPath().isEmpty() ? "/" : requestUri.getPath(),
                    requestUri.getQuery() != null ? requestUri.getQuery() : "",
                    getCanonicalHeaders(),
                    getSignedHeaders(),
                    CryptoUtils.sha256Hex(payload)
            );
        }

        private String getCanonicalHeaders() {
            return headers.entrySet().stream()
                    .map(entry -> entry.getKey() + ":" + entry.getValue())
                    .collect(Collectors.joining("\n")) + "\n";
        }

        private String getAlgorithm() {
            return "AWS4-HMAC-SHA256";
        }

        private byte[] getSignatureKey(String key, String dateStamp, String regionName, String serviceName) {
            byte[] secret = ("AWS4" + key).getBytes(StandardCharsets.UTF_8);
            byte[] date = CryptoUtils.hmac256(secret, dateStamp);
            byte[] region = CryptoUtils.hmac256(date, regionName);
            byte[] service = CryptoUtils.hmac256(region, serviceName);
            return CryptoUtils.hmac256(service, "aws4_request");
        }


    }
}


