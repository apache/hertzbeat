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

package org.apache.hertzbeat.collector.collect.mongodb;

import com.mongodb.client.MongoClient;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.common.cache.AbstractConnection;

/**
 * mongodb connect client
 */
@Slf4j
public class MongodbConnect extends AbstractConnection<MongoClient> {
    private final MongoClient mongoClient;

    public MongodbConnect(MongoClient mongoClient) {
        this.mongoClient = mongoClient;
    }

    @Override
    public void closeConnection() throws Exception {
        if (this.mongoClient != null) {
            this.mongoClient.close();
        }
    }

    @Override
    public MongoClient getConnection() {
        return mongoClient;
    }
}
