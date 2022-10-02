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

package com.usthe.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * common properties
 *
 * @author tom
 * @date 2021/11/24 10:38
 */
@Component
@ConfigurationProperties(prefix = "common")
public class CommonProperties {

    /**
     * secret key for password aes entry, must 16 bits
     */
    private String secretKey;

    /**
     * data queue impl
     */
    private DataQueueProperties queue;

    public String getSecretKey() {
        return secretKey;
    }

    public void setSecretKey(String secretKey) {
        this.secretKey = secretKey;
    }

    public DataQueueProperties getQueue() {
        return queue;
    }

    public void setQueue(DataQueueProperties queue) {
        this.queue = queue;
    }

    public static class DataQueueProperties {

        private QueueType type = QueueType.Memory;

        public QueueType getType() {
            return type;
        }

        public void setType(QueueType type) {
            this.type = type;
        }
    }

    public static enum QueueType {
        /** in memory **/
        Memory,
        /** kafka **/
        Kafka,
        /** rabbit mq **/
        Rabbit_Mq
    }
}
