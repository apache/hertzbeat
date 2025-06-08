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
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.alert.dto.HuaweiCloudExternAlert;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.ExternAlertService;
import org.apache.hertzbeat.alert.util.DateUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.support.exception.IgnoreException;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.Signature;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.text.MessageFormat;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.apache.hertzbeat.alert.dto.HuaweiCloudExternAlert.AlertType.NOTIFICATION;
import static org.apache.hertzbeat.alert.dto.HuaweiCloudExternAlert.AlertType.SUBSCRIPTION;
import static org.apache.hertzbeat.alert.dto.HuaweiCloudExternAlert.AlertType.UNSUBSCRIBE;
import static org.apache.hertzbeat.alert.dto.HuaweiCloudExternAlert.FIELD_MESSAGE;
import static org.apache.hertzbeat.alert.dto.HuaweiCloudExternAlert.FIELD_MESSAGE_ID;
import static org.apache.hertzbeat.alert.dto.HuaweiCloudExternAlert.FIELD_SUBJECT;
import static org.apache.hertzbeat.alert.dto.HuaweiCloudExternAlert.FIELD_SUBSCRIBE_URL;
import static org.apache.hertzbeat.alert.dto.HuaweiCloudExternAlert.FIELD_TIMESTAMP;
import static org.apache.hertzbeat.alert.dto.HuaweiCloudExternAlert.FIELD_TOPIC_URN;
import static org.apache.hertzbeat.alert.dto.HuaweiCloudExternAlert.FIELD_TYPE;

/**
 * Huawei cloud external alarm service impl
 */
@Slf4j
@Service
public class HuaweiCloudExternAlertService implements ExternAlertService {

    private static final String CERTIFICATE_TYPE = "X.509";

    private static final String CHARSET_UTF8 = StandardCharsets.UTF_8.name();

    private final AlarmCommonReduce alarmCommonReduce;

    public HuaweiCloudExternAlertService(AlarmCommonReduce alarmCommonReduce) {
        this.alarmCommonReduce = alarmCommonReduce;
    }

    @Override
    public void addExternAlert(String content) {
        HuaweiCloudExternAlert externAlert = JsonUtil.fromJson(content, HuaweiCloudExternAlert.class);
        if (externAlert == null || StringUtils.isBlank(externAlert.getMessage())) {
            log.warn("Failure to parse external alert content. content: {}", content);
            return;
        }
        if (!isMessageValid(externAlert)) {
            log.warn("Huawei cloud alert verify failed. content: {}", content);
            return;
        }
        process(externAlert);
    }

    /**
     * Process according to different types
     *
     * @param externAlert alert content entity
     */
    private void process(HuaweiCloudExternAlert externAlert) {
        if (NOTIFICATION.getType().equals(externAlert.getType())) {
            Optional.ofNullable(buildSendAlert(externAlert)).ifPresent(alarmCommonReduce::reduceAndSendAlarm);
        } else if (SUBSCRIPTION.getType().equals(externAlert.getType())) {
            autoSubscribeForUrl(externAlert.getSubscribeUrl());
        } else if (UNSUBSCRIBE.getType().equals(externAlert.getType())) {
            log.warn("Huawei cloud notifies the recipient of the notification to cancel the subscription.");
        }
    }

    /**
     * Build single alert.
     *
     * @param externAlert alert content entity
     * @return single alert
     */
    private SingleAlert buildSendAlert(HuaweiCloudExternAlert externAlert) {
        HuaweiCloudExternAlert.AlertMessage message = JsonUtil.fromJson(externAlert.getMessage(), HuaweiCloudExternAlert.AlertMessage.class);
        if (null == message || null == message.getData()) {
            log.warn("Failure to parse external alert message. message: {}", externAlert.getMessage());
            return null;
        }
        // Note: Empty and false are both recovery notifications.
        // Note: There are no recovery notifications for event types
        boolean isAlarm = null != message.getData().getAlarm() && message.getData().getAlarm();
        Long alarmTime = DateUtil.getZonedTimeStampFromFormat(message.getData().getAlarmTime(), "yyyy/MM/dd HH:mm:ss 'GMT'XXX");
        return SingleAlert.builder()
                .triggerTimes(1)
                .status(isAlarm ? CommonConstants.ALERT_STATUS_FIRING : CommonConstants.ALERT_STATUS_RESOLVED)
                .startAt(alarmTime)
                .activeAt(Instant.now().toEpochMilli())
                .endAt(isAlarm ? null : alarmTime)
                .labels(buildLabels(message.getData()))
                .annotations(buildAnnotations(message.getData()))
                .content(formatContent(externAlert.getSubject(), message.getData()))
                .build();
    }

    /**
     * Build basic annotations and fill annotations for huawei cloud.
     *
     * @param alertData alert content entity
     * @return annotations
     */
    private Map<String, String> buildAnnotations(HuaweiCloudExternAlert.AlertData alertData) {
        Map<String, String> annotations = new HashMap<>(8);
        if (null != alertData) {
            putIfNotBlank(annotations, "region", alertData.getRegion());
            putIfNotBlank(annotations, "dimensionName", alertData.getDimensionName());
            putIfNotBlank(annotations, "resourceName", alertData.getResourceName());
            putIfNotBlank(annotations, "alarmRecordId", alertData.getAlarmRecordId());
        }
        return annotations;
    }

    /**
     * Build basic labels and fill labels for huawei cloud.
     *
     * @param alertData alert content entity
     * @return labels
     */
    private Map<String, String> buildLabels(HuaweiCloudExternAlert.AlertData alertData) {
        Map<String, String> labels = new HashMap<>(8);
        labels.put("__source__", "huaweicloud-ces");
        if (null != alertData) {
            putIfNotBlank(labels, "namespace", alertData.getNamespace());
            putIfNotBlank(labels, "metricName", alertData.getMetricName());
            putIfNotBlank(labels, "resourceId", alertData.getResourceId());
            putIfNotBlank(labels, "level", alertData.getAlarmLevel());
        }
        return labels;
    }

    /**
     * todo i18n
     *
     * @param subject alert subject
     * @param alertData alert content entity
     * @return content
     */
    private String formatContent(String subject, HuaweiCloudExternAlert.AlertData alertData) {
        if (null == alertData) {
            return subject;
        }
        return MessageFormat.format(
                "{0} threshold:{1}{2}, current：{3}",
                subject,
                alertData.getComparisonOperator(),
                alertData.getValue(),
                alertData.getCurrentData()
        );
    }

    /**
     * Automatic subscription url.
     *
     * @param subscribeUrl subscribeUrl
     */
    public void autoSubscribeForUrl(String subscribeUrl) {
        if (StringUtils.isBlank(subscribeUrl)) {
            return;
        }
        try (CloseableHttpClient httpClient = HttpClients.createDefault()) {
            HttpGet httpGet = new HttpGet(subscribeUrl);
            try (CloseableHttpResponse response = httpClient.execute(httpGet)) {
                int statusCode = response.getStatusLine().getStatusCode();
                String responseBody = EntityUtils.toString(response.getEntity());

                if (statusCode != 200) {
                    log.error("Subscribe url request failed with status code: " + statusCode + ", response: " + responseBody);
                    return;
                }
                JsonNode jsonResponse = JsonUtil.fromJson(responseBody);
                if (jsonResponse == null) {
                    throw new IgnoreException("Subscribe url failed with status code: " + statusCode + ", response: " + responseBody);
                }
                JsonNode surnNode = jsonResponse.get("subscription_urn");
                if (surnNode == null || StringUtils.isBlank(surnNode.asText())) {
                    throw new IgnoreException("Subscribe url failed with status code: " + statusCode + ", response: " + responseBody);
                }
                log.info("Successfully subscribed to Huawei Cloud(SMN) url.");
            }
        } catch (Exception e) {
            log.error("Failed to subscribe url request: {}", e.getMessage());
        }
    }

    /**
     * Verifying the signature of huawei cloud alert message.
     *
     * @param externAlert alert content entity
     * @return verification result
     * @throws SecurityException thrown when validation fails
     */
    private boolean isMessageValid(HuaweiCloudExternAlert externAlert) {
        try {
            String signMessage = buildSignMessage(externAlert);
            if (StringUtils.isBlank(signMessage)) {
                throw new SecurityException("Verify sign message is null");
            }
            X509Certificate cert = getCertificate(externAlert.getSigningCertUrl());
            return verifySignature(signMessage, cert, externAlert.getSignature());
        } catch (Exception e) {
            log.error("Failed to verify message signature: ", e);
            return false;
        }
    }

    /**
     * Build sign message.
     *
     * @param externAlert alert content entity
     * @return sign message
     */
    private String buildSignMessage(HuaweiCloudExternAlert externAlert) {
        if (NOTIFICATION.getType().equals(externAlert.getType())) {
            return buildNotificationMessage(externAlert);
        } else if (SUBSCRIPTION.getType().equals(externAlert.getType()) || UNSUBSCRIBE.getType().equals(externAlert.getType())){
            return buildSubscriptionMessage(externAlert);
        }
        return null;
    }

    /**
     * Building sign message of 'Notification' type
     *
     * @param externAlert alert content entity
     * @return sign message
     */
    private String buildNotificationMessage(HuaweiCloudExternAlert externAlert) {
        StringBuilder message = new StringBuilder();
        appendField(message, FIELD_MESSAGE, externAlert.getMessage());
        appendField(message, FIELD_MESSAGE_ID, externAlert.getMessageId());
        if (StringUtils.isNotBlank(externAlert.getSubject())) {
            appendField(message, FIELD_SUBJECT, externAlert.getSubject());
        }
        appendField(message, FIELD_TIMESTAMP, externAlert.getTimestamp());
        appendField(message, FIELD_TOPIC_URN, externAlert.getTopicUrn());
        appendField(message, FIELD_TYPE, externAlert.getType());
        return message.toString();
    }

    /**
     * Building sign message of 'SubscriptionConfirmation' or 'UnsubscribeConfirmation' type
     *
     * @param externAlert alert content entity
     * @return sign message
     */
    private String buildSubscriptionMessage(HuaweiCloudExternAlert externAlert) {
        StringBuilder message = new StringBuilder();
        appendField(message, FIELD_MESSAGE, externAlert.getMessage());
        appendField(message, FIELD_MESSAGE_ID, externAlert.getMessageId());
        appendField(message, FIELD_SUBSCRIBE_URL, externAlert.getSubscribeUrl());
        appendField(message, FIELD_TIMESTAMP, externAlert.getTimestamp());
        appendField(message, FIELD_TOPIC_URN, externAlert.getTopicUrn());
        appendField(message, FIELD_TYPE, externAlert.getType());
        return message.toString();
    }

    /**
     * Obtain certificate
     *
     * @param signCertUrl sign cert url
     * @return X509 certificate
     * @throws Exception Thrown when certificate acquisition fails
     */
    private X509Certificate getCertificate(String signCertUrl) throws Exception {
        URL url = new URL(signCertUrl);
        try (InputStream in = url.openStream()) {
            CertificateFactory cf = CertificateFactory.getInstance(CERTIFICATE_TYPE);
            return (X509Certificate) cf.generateCertificate(in);
        }
    }

    /**
     * Verify signature
     *
     * @param message sign message
     * @param cert cert
     * @param signature signature
     * @return verification result
     * @throws Exception thrown when an error occurs in the validation process
     */
    private boolean verifySignature(String message, X509Certificate cert, String signature) throws Exception {
        Signature sig = Signature.getInstance(cert.getSigAlgName());
        sig.initVerify(cert.getPublicKey());
        sig.update(message.getBytes(CHARSET_UTF8));
        return sig.verify(Base64.getDecoder().decode(signature));
    }

    private void putIfNotBlank(Map<String, String> map, String key, String value) {
        if (StringUtils.isNotBlank(value)){
            map.put(key, value);
        }
    }

    private void appendField(StringBuilder builder, String fieldName, String value) {
        builder.append(fieldName).append("\n").append(value).append("\n");
    }

    @Override
    public String supportSource() {
        return "huaweicloud-ces";
    }

}