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

package org.apache.hertzbeat.collector.collect.kafka;

import org.apache.hertzbeat.collector.collect.common.cache.AbstractConnection;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.apache.kafka.clients.admin.KafkaAdminClient;

import java.util.Properties;

/**
 * Kafka connection
 */
public class KafkaConnect extends AbstractConnection<AdminClient> {


    private static AdminClient adminClient;

    public KafkaConnect(String brokerList) {
        Properties properties = new Properties();
        properties.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, brokerList);
        properties.put(AdminClientConfig.RETRIES_CONFIG, 3);
        properties.put(AdminClientConfig.RETRY_BACKOFF_MS_CONFIG, 500);
        adminClient = KafkaAdminClient.create(properties);
    }

    @Override
    public AdminClient getConnection() {
        return adminClient;
    }

    @Override
    public void closeConnection() {
        if (adminClient != null) {
            adminClient.close();
        }
    }

    public static synchronized AdminClient getAdminClient(String brokerList) {
        if (adminClient == null) {
            Properties properties = new Properties();
            properties.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, brokerList);
            adminClient = KafkaAdminClient.create(properties);
        }
        return adminClient;
    }

}
