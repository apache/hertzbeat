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

import jakarta.xml.bind.DatatypeConverter;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.config.TencentSmsProperties;
import org.apache.hertzbeat.alert.service.SmsClient;
import org.apache.hertzbeat.alert.util.CryptoUtils;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.support.exception.SendMessageException;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;
import org.apache.hertzbeat.common.util.JsonUtil;
import com.fasterxml.jackson.databind.JsonNode;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.TimeZone;

import static org.apache.hertzbeat.common.constants.SmsConstants.TENCENT;

/**
 * sms service client for tencent cloud <br>
 * doc: <a href="https://cloud.tencent.com/document/api/382/55981">https://cloud.tencent.com/document/api/382/55981</a>
 */

@Slf4j
public class TencentSmsClientImpl implements SmsClient {

    private static final String RESPONSE_OK = "Ok";
    private static final String REGION = "ap-guangzhou";
    private static final String API_VERSION = "2021-01-11";
    private static final String ACTION = "SendSms";
    private static final String HOST = "sms.tencentcloudapi.com";
    private static final Charset UTF8 = StandardCharsets.UTF_8;
    
    private String appId;
    private String signName;
    private String templateId;
    private String secretId;
    private String secretKey;

    public TencentSmsClientImpl(TencentSmsProperties config) {
        if (config != null) {
            this.appId = config.getAppId();
            this.signName = config.getSignName();
            this.templateId = config.getTemplateId();
            this.secretId = config.getSecretId();
            this.secretKey = config.getSecretKey();
        }
    }

    @Override
    public void sendMessage(NoticeReceiver receiver, NoticeTemplate noticeTemplate, GroupAlert alert) {
        // todo limit the number of words
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

        String[] templateValues = new String[3];
        templateValues[0] = instance == null ? alert.getGroupKey() : instance;
        templateValues[1] = priority == null ? "unknown" : priority;
        templateValues[2] = content;

        String[] phones = new String[1];
        phones[0] = receiver.getPhone();

        sendSms(this.appId, this.signName, this.templateId, templateValues, phones);
    }

    public void sendSms(String appId, String signName, String templateId,
                     String[] templateValues, String[] phones) {
        try (CloseableHttpClient httpClient = HttpClients.createDefault()) {
            String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
            
            // build request payload
            Map<String, Object> params = new HashMap<>();
            params.put("SmsSdkAppId", appId);
            params.put("SignName", signName);
            params.put("TemplateId", templateId);
            params.put("TemplateParamSet", templateValues);
            params.put("PhoneNumberSet", phones);
            
            String payload = JsonUtil.toJson(params);
            
            // calculate request signature
            String authorization = calculateAuthorization(
                    secretId, secretKey, "sms", HOST, REGION,
                    ACTION, API_VERSION, payload);
            
            // build http request
            HttpPost httpPost = new HttpPost("https://" + HOST);
            httpPost.setHeader("Content-Type", "application/json; charset=utf-8");
            httpPost.setHeader("Host", HOST);
            httpPost.setHeader("X-TC-Action", ACTION);
            httpPost.setHeader("X-TC-Timestamp", timestamp);
            httpPost.setHeader("X-TC-Version", API_VERSION);
            httpPost.setHeader("X-TC-Region", REGION);
            httpPost.setHeader("Authorization", authorization);
            httpPost.setEntity(new StringEntity(payload, StandardCharsets.UTF_8));

            log.debug("Sending SMS request to {}, payload: {}", httpPost.getURI(), payload);

            // send http request and handle response
            try (CloseableHttpResponse response = httpClient.execute(httpPost)) {
                int statusCode = response.getStatusLine().getStatusCode();
                String responseBody = EntityUtils.toString(response.getEntity());

                log.debug("SMS response status: {}, body: {}", statusCode, responseBody);
                
                if (statusCode != 200) {
                    throw new SendMessageException("HTTP request failed with status code: " + statusCode);
                }
                
                JsonNode jsonResponse = JsonUtil.fromJson(responseBody);
                JsonNode responseNode = jsonResponse.get("Response");
                JsonNode error = responseNode.get("Error");
                if (error != null) {
                    String code = error.get("Code").asText();
                    String message = error.get("Message").asText();
                    throw new SendMessageException(code + ":" + message);
                }
                JsonNode sendStatusSet = responseNode.get("SendStatusSet");
                if (sendStatusSet != null && sendStatusSet.isArray() && sendStatusSet.size() > 0) {
                    JsonNode firstStatus = sendStatusSet.get(0);
                    String code = firstStatus.get("Code").asText();
                    String message = firstStatus.get("Message").asText();
                    if (!RESPONSE_OK.equals(code)) {
                        throw new SendMessageException(code + ":" + message);
                    }
                }
                log.info("Successfully sent SMS to phones: {}", String.join(",", phones));
            }
        } catch (Exception e) {
            log.warn("Failed to send SMS: {}", e.getMessage());
            throw new SendMessageException(e.getMessage());
        }
    }

    @Override
    public String getType() {
        return TENCENT;
    }

    @Override
    public boolean checkConfig() {
        if (appId.isBlank() || templateId.isBlank() || secretId.isBlank() || secretKey.isBlank()) {
            return false;
        }
        return true;
    }

    public static String calculateAuthorization(String secretId, String secretKey,
                                                String service, String host, String region,
                                                String action, String version, String payload) throws Exception {
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
        sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
        String date = sdf.format(new Date(Long.valueOf(timestamp + "000")));

        // Step 1: Construct the canonical request string
        String httpRequestMethod = "POST";
        String canonicalUri = "/";
        String canonicalQueryString = "";
        String canonicalHeaders = "content-type:application/json; charset=utf-8\n" + "host:" + host + "\n";
        String signedHeaders = "content-type;host";
        String hashedRequestPayload = CryptoUtils.sha256Hex(payload);
        String canonicalRequest = httpRequestMethod + "\n" + canonicalUri + "\n" + canonicalQueryString + "\n"
                + canonicalHeaders + "\n" + signedHeaders + "\n" + hashedRequestPayload;

        // Step 2: Construct the string to sign
        String algorithm = "TC3-HMAC-SHA256";
        String credentialScope = date + "/" + service + "/" + "tc3_request";
        String hashedCanonicalRequest = CryptoUtils.sha256Hex(canonicalRequest);
        String stringToSign = algorithm + "\n" + timestamp + "\n" + credentialScope + "\n" + hashedCanonicalRequest;

        // Step 3: Calculate the signature
        byte[] secretDate = CryptoUtils.hmac256(("TC3" + secretKey).getBytes(UTF8), date);
        byte[] secretService = CryptoUtils.hmac256(secretDate, service);
        byte[] secretSigning = CryptoUtils.hmac256(secretService, "tc3_request");
        String signature = DatatypeConverter.printHexBinary(
                CryptoUtils.hmac256(secretSigning, stringToSign)).toLowerCase();

        // Step 4: Construct the Authorization header
        return algorithm + " " + "Credential=" + secretId + "/" + credentialScope + ", "
                + "SignedHeaders=" + signedHeaders + ", " + "Signature=" + signature;
    }
}
