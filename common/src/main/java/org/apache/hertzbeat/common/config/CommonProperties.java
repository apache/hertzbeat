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

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * common module properties
 */
@ConfigurationProperties(prefix = "common")
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

    public String getSecret() {
        return secret;
    }

    public DataQueueProperties getQueue() {
        return queue;
    }

    public SmsProperties getSms() {
        return sms;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public void setQueue(DataQueueProperties queue) {
        this.queue = queue;
    }

    public void setSms(SmsProperties sms) {
        this.sms = sms;
    }

    /**
     * data queue properties
     */
    public static class DataQueueProperties {

        private QueueType type = QueueType.Memory;

        private KafkaProperties kafka;

        private RedisProperties redis;

        public QueueType getType() {
            return type;
        }

        public void setType(QueueType type) {
            this.type = type;
        }

        public KafkaProperties getKafka() {
            return kafka;
        }

        public void setKafka(KafkaProperties kafka) {
            this.kafka = kafka;
        }

        public RedisProperties getRedis() {

            return redis;
        }

        public void setRedis(RedisProperties redis) {

            this.redis = redis;
        }
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

        public int getRedisPort() {

            return redisPort;
        }

        public void setRedisPort(int redisPort) {

            this.redisPort = redisPort;
        }

        public String getRedisHost() {

            return redisHost;
        }

        public void setRedisHost(String redisHost) {

            this.redisHost = redisHost;
        }

        public String getMetricsDataQueueNameToAlerter() {

            return metricsDataQueueNameToAlerter;
        }

        public void setMetricsDataQueueNameToAlerter(String metricsDataQueueNameToAlerter) {

            this.metricsDataQueueNameToAlerter = metricsDataQueueNameToAlerter;
        }

        public String getMetricsDataQueueNameToPersistentStorage() {

            return metricsDataQueueNameToPersistentStorage;
        }

        public void setMetricsDataQueueNameToPersistentStorage(String metricsDataQueueNameToPersistentStorage) {

            this.metricsDataQueueNameToPersistentStorage = metricsDataQueueNameToPersistentStorage;
        }

        public String getMetricsDataQueueNameToRealTimeStorage() {

            return metricsDataQueueNameToRealTimeStorage;
        }

        public void setMetricsDataQueueNameToRealTimeStorage(String metricsDataQueueNameToRealTimeStorage) {

            this.metricsDataQueueNameToRealTimeStorage = metricsDataQueueNameToRealTimeStorage;
        }

        public String getAlertsDataQueueName() {

            return alertsDataQueueName;
        }

        public void setAlertsDataQueueName(String alertsDataQueueName) {

            this.alertsDataQueueName = alertsDataQueueName;
        }

    }

    /**
     * kafka data queue properties
     */
    public static class KafkaProperties {
        /**
         * kafka's connection server url
         */
        private String servers;
        /**
         * metrics data topic
         */
        private String metricsDataTopic;
        /**
         * alerts data topic
         */
        private String alertsDataTopic;

        public String getServers() {
            return servers;
        }

        public void setServers(String servers) {
            this.servers = servers;
        }

        public String getMetricsDataTopic() {
            return metricsDataTopic;
        }

        public void setMetricsDataTopic(String metricsDataTopic) {
            this.metricsDataTopic = metricsDataTopic;
        }

        public String getAlertsDataTopic() {
            return alertsDataTopic;
        }

        public void setAlertsDataTopic(String alertsDataTopic) {
            this.alertsDataTopic = alertsDataTopic;
        }
    }

    /**
     * sms properties
     */
    public static class SmsProperties {
        //Tencent cloud SMS configuration
        private TencentSmsProperties tencent;
        //Ali cloud SMS configuration
        private AliYunSmsProperties aliYun;

        public TencentSmsProperties getTencent() {
            return tencent;
        }

        public void setTencent(TencentSmsProperties tencent) {
            this.tencent = tencent;
        }

        public AliYunSmsProperties getAliYun() {
            return aliYun;
        }

        public void setAliYun(AliYunSmsProperties aliYun) {
            this.aliYun = aliYun;
        }
    }

    /**
     * tencent sms properties
     */
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

        public String getSecretId() {
            return secretId;
        }

        public void setSecretId(String secretId) {
            this.secretId = secretId;
        }

        public String getSecretKey() {
            return secretKey;
        }

        public void setSecretKey(String secretKey) {
            this.secretKey = secretKey;
        }

        public String getAppId() {
            return appId;
        }

        public void setAppId(String appId) {
            this.appId = appId;
        }

        public String getSignName() {
            return signName;
        }

        public void setSignName(String signName) {
            this.signName = signName;
        }

        public String getTemplateId() {
            return templateId;
        }

        public void setTemplateId(String templateId) {
            this.templateId = templateId;
        }
    }

    /**
     * aliYun sms properties
     */
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

        public String getAppId() {
            return appId;
        }

        public void setAppId(String appId) {
            this.appId = appId;
        }

        public String getSecretId() {
            return secretId;
        }

        public void setSecretId(String secretId) {
            this.secretId = secretId;
        }

        public String getSecretKey() {
            return secretKey;
        }

        public void setSecretKey(String secretKey) {
            this.secretKey = secretKey;
        }

        public String getSignName() {
            return signName;
        }

        public void setSignName(String signName) {
            this.signName = signName;
        }

        public String getTemplateId() {
            return templateId;
        }

        public void setTemplateId(String templateId) {
            this.templateId = templateId;
        }
    }
}
