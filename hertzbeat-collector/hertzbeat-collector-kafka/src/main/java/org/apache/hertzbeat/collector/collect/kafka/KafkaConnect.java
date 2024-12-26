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

import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.collector.collect.common.cache.AbstractConnection;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.apache.kafka.clients.admin.KafkaAdminClient;

import java.util.Properties;

/**
 * Kafka connection
 */
public class KafkaConnect extends AbstractConnection<AdminClient> {
    private final AdminClient adminClient;

    public KafkaConnect(AdminClient adminClient) {
        this.adminClient = adminClient;
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


}