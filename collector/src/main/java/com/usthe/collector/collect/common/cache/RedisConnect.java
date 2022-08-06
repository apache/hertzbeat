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

package com.usthe.collector.collect.common.cache;

import io.lettuce.core.api.StatefulRedisConnection;
import lombok.extern.slf4j.Slf4j;

/**
 * redis connection
 *
 * @author tom
 * @date 2022/5/25 08:12
 */
@Slf4j
public class RedisConnect implements CacheCloseable {

    private StatefulRedisConnection<String, String> connection;

    public RedisConnect(StatefulRedisConnection<String, String> connection) {
        this.connection = connection;
    }

    @Override
    public void close() {
        try {
            if (connection != null) {
                connection.closeAsync();
            }
        } catch (Exception e) {
            log.error("close redis connect error: {}", e.getMessage());
        }
    }

    @Override
    protected void finalize() throws Throwable {
        close();
        super.finalize();
    }

    public StatefulRedisConnection<String, String> getConnection() {
        return connection;
    }
}
