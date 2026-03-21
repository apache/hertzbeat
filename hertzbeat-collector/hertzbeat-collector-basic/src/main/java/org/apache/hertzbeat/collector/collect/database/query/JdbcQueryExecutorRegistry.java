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

package org.apache.hertzbeat.collector.collect.database.query;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;
import org.apache.hertzbeat.common.entity.job.Metrics;

/**
 * Static registry used by JdbcCommonCollect to discover optional query executors.
 */
public final class JdbcQueryExecutorRegistry {

    private static final List<JdbcQueryExecutor> EXECUTORS = new CopyOnWriteArrayList<>();

    private JdbcQueryExecutorRegistry() {
    }

    public static void register(JdbcQueryExecutor executor) {
        if (executor == null || EXECUTORS.contains(executor)) {
            return;
        }
        EXECUTORS.add(executor);
    }

    public static void unregister(JdbcQueryExecutor executor) {
        if (executor == null) {
            return;
        }
        EXECUTORS.remove(executor);
    }

    public static Optional<JdbcQueryExecutor> resolve(Metrics metrics) {
        return EXECUTORS.stream()
                .filter(executor -> executor.supports(metrics))
                .findFirst();
    }
}
