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

package org.apache.hertzbeat.alert.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Arrays;

/**
 * Huawei Cloud (CES) alert content entity.
 *
 * @see <a href="https://support.huaweicloud.com/usermanual-ces/ces_01_0218.html"/>
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class HuaweiCloudExternAlert {

    public static final String FIELD_MESSAGE = "message";
    public static final String FIELD_MESSAGE_ID = "message_id";
    public static final String FIELD_TIMESTAMP = "timestamp";
    public static final String FIELD_TOPIC_URN = "topic_urn";
    public static final String FIELD_TYPE = "type";
    public static final String FIELD_SUBJECT = "subject";
    public static final String FIELD_SUBSCRIBE_URL = "subscribe_url";

    /**
     * Signature information.
     */
    private String signature;

    /**
     * Subject
     */
    private String subject;

    /**
     * The unique identifier of a topic, indicating the topic to which the message belongs.
     */
    @JsonProperty("topic_urn")
    private String topicUrn;

    /**
     * Message unique identifier.
     */
    @JsonProperty("message_id")
    private String messageId;

    /**
     * Message
     */
    private String message;

    /**
     * message types, the message types are respectively:
     * SubscriptionConfirmation、Notification、UnsubscribeConfirmation
     */
    private String type;

    /**
     * Subscription confirms the URL that needs to be accessed
     */
    @JsonProperty("subscribe_url")
    private String subscribeUrl;

    /**
     * The certificate URL used for message signing, which does not require authentication and can be accessed directly.
     */
    @JsonProperty("signing_cert_url")
    private String signingCertUrl;

    /**
     * The timestamp of when the message was first sent.
     */
    private String timestamp;

    /**
     * Alert message
     */
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AlertMessage {

        private String version;

        private AlertData data;
    }

    /**
     * Alert data
     */
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AlertData {

        /**
         * Whether an alarm occurs.
         * Note: Empty and false are both recovery notifications.
         * Note: There are no recovery notifications for event types
         */
        @JsonProperty("IsAlarm")
        private Boolean alarm;

        /**
         * Alarm time
         */
        @JsonProperty("AlarmTime")
        private String alarmTime;

        /**
         * Resource ID
         */
        @JsonProperty("ResourceId")
        private String resourceId;

        /**
         * The name of the metric
         */
        @JsonProperty("MetricName")
        private String metricName;

        /**
         * Specifies the alarm severity, which can be Critical, Major, Minor, or Informational.
         */
        @JsonProperty("AlarmLevel")
        private String alarmLevel;

        /**
         * Namespace
         */
        @JsonProperty("Namespace")
        private String namespace;

        /**
         * Region
         */
        @JsonProperty("Region")
        private String region;

        /**
         * Dimension name
         */
        @JsonProperty("DimensionName")
        private String dimensionName;

        /**
         * Resource name
         */
        @JsonProperty("ResourceName")
        private String resourceName;

        /**
         * Alarm record ID
         */
        @JsonProperty("AlarmRecordID")
        private String alarmRecordId;

        /**
         * Current data
         */
        @JsonProperty("CurrentData")
        private String currentData;

        /**
         * The comparison conditions for the alarm thresholds can be >, =, <, >=, <=.
         */
        @JsonProperty("ComparisonOperator")
        private String comparisonOperator;

        /**
         * Alarm value
         */
        @JsonProperty("Value")
        private String value;

        /**
         * Number of consecutive occurrences of triggered alarms
         */
        @JsonProperty("Count")
        private int count;

    }

    /**
     * Huawei cloud alert type
     */
    public enum AlertType {

        SUBSCRIPTION("SubscriptionConfirmation"),

        UNSUBSCRIBE("UnsubscribeConfirmation"),

        NOTIFICATION("Notification");

        private final String type;

        AlertType(String type) {
            this.type = type;
        }

        public static boolean valid(String type) {
            if (null == type || type.isEmpty()) {
                return false;
            }
            return Arrays.stream(AlertType.values()).anyMatch(alertType -> alertType.getType().equals(type));
        }

        public String getType() {
            return type;
        }
    }

}