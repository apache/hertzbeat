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

package org.apache.hertzbeat.common.config;

import lombok.Getter;
import lombok.Setter;
import org.apache.hertzbeat.common.constants.ConfigConstants;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * common module properties
 */

@Getter
@Setter
@ConfigurationProperties(prefix =
        ConfigConstants.FunctionModuleConstants.COMMON)
public class CommonProperties {

    /**
     * secret key for password aes entry, must 16 bits
     */
    private String secret;

    /**
     * data queue impl
     */
    private DataQueueProperties queue;

    /**
     * sms impl properties
     */
    private SmsProperties sms;

    /**
     * data queue properties
     */
    @Getter
    @Setter
    public static class DataQueueProperties {

        private QueueType type = QueueType.Memory;

        private KafkaProperties kafka;

        private RedisProperties redis;

    }

    /**
     * data queue type
     */
    public enum QueueType {
        /** in memory **/
        Memory,
        /** kafka **/
        Kafka,
        /** with netty connect **/
        Netty,
        /** rabbit mq **/
        Rabbit_Mq,
        /** redis **/
        Redis
    }

    /**
     * redis data queue properties
     */
    @Getter
    @Setter
    public static class RedisProperties {

        /**
         * redis server host.
         */
        private String redisHost;

        /**
         * redis server port.
         */
        private int redisPort;

        /**
         * Queue name for metrics data to alerter
         */
        private String metricsDataQueueNameToAlerter;

        /**
         * Queue name for metrics data to persistent storage
         */
        private String metricsDataQueueNameToPersistentStorage;

        /**
         * Queue name for metrics data to real-time storage
         */
        private String metricsDataQueueNameToRealTimeStorage;

        /**
         * Queue name for alerts data
         */
        private String alertsDataQueueName;

    }

    /**
     * kafka data queue properties
     */
    @Getter
    @Setter
    public static class KafkaProperties extends BaseKafkaProperties {

        /**
         * metrics data topic
         */
        private String metricsDataTopic;
        /**
         * alerts data topic
         */
        private String alertsDataTopic;
    }

    /**
     * sms properties
     */
    @Getter
    @Setter
    public static class SmsProperties {
        //Tencent cloud SMS configuration
        private TencentSmsProperties tencent;
        //Ali cloud SMS configuration
        private AliYunSmsProperties aliYun;
    }

    /**
     * tencent sms properties
     */
    @Getter
    @Setter
    public static class TencentSmsProperties {

        /**
         * Tencent cloud account secret id
         */
        private String secretId;

        /**
         * Tencent cloud account secret key
         */
        private String secretKey;

        /**
         * SMS app id
         */
        private String appId;

        /**
         * SMS signature
         */
        private String signName;

        /**
         * SMS template ID
         */
        private String templateId;
    }

    /**
     * aliYun sms properties
     */
    @Getter
    @Setter
    public static class AliYunSmsProperties {

        /**
         * Aliyun account access key id
         */
        private String secretId;

        /**
         * Ali Cloud account access key
         */
        private String secretKey;

        /**
         *  SMS app id
         */
        private String appId;

        /**
         * SMS signature
         */
        private String signName;

        /**
         * ID of the SMS template
         */
        private String templateId;
    }

}
