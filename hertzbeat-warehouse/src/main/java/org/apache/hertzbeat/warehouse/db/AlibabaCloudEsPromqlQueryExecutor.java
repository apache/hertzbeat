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

package org.apache.hertzbeat.warehouse.db;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.warehouse.store.history.tsdb.alibabacloud.AlibabaCloudEsProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

/**
 * query executor for alibaba cloud elasticsearch
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "warehouse.store.alibabacloud-es", name = "enabled", havingValue = "true")
public class AlibabaCloudEsPromqlQueryExecutor extends PromqlQueryExecutor {

    private static final String QUERY_PATH = "/_time_stream/prom/%s/query";
    private static final String QUERY_RANGE_PATH = "/_time_stream/prom/%s/query_range";

    private final String datasource;

    AlibabaCloudEsPromqlQueryExecutor(AlibabaCloudEsProperties properties, RestTemplate restTemplate) {

    }

    @Override
    public String getDatasource() {
        return datasource;
    }
}