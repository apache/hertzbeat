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

package org.apache.hertzbeat.collector.mysql.r2dbc;

import java.time.Duration;

import lombok.Builder;
import lombok.Getter;
import lombok.ToString;
import org.springframework.util.StringUtils;

/**
 * Collector-only execution options for a target MySQL query.
 */
@Getter
@Builder(toBuilder = true)
@ToString(exclude = "password")
public class QueryOptions {

    private final String host;
    @Builder.Default
    private final int port = 3306;
    private final String username;
    private final String password;
    private final String database;
    private final String schema;
    @Builder.Default
    private final Duration timeout = Duration.ofSeconds(6);
    @Builder.Default
    private final int maxRows = 1000;
    @Builder.Default
    private final int fetchSize = 256;
    @Builder.Default
    private final boolean readOnly = true;

    public String resolvedDatabase() {
        if (StringUtils.hasText(database)) {
            return database;
        }
        if (StringUtils.hasText(schema)) {
            return schema;
        }
        return null;
    }
}
