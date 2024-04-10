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

package org.apache.hertzbeat.collector.collect.common.cache;

import lombok.extern.slf4j.Slf4j;

import javax.management.remote.JMXConnector;

/**
 * jmx connect object
 **/
@Slf4j
public class JmxConnect implements CacheCloseable {

    private final JMXConnector connection;

    public JmxConnect(JMXConnector connection) {
        this.connection = connection;
    }


    @Override
    public void close() {
        try {
            if (connection != null) {
                connection.close();
            }
        } catch (Exception e) {
            log.error("[connection common cache] close jmx connect error: {}", e.getMessage());
        }
    }

    public JMXConnector getConnection() {
        return connection;
    }
}
