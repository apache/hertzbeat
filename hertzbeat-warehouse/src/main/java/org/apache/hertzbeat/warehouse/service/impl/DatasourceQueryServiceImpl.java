/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.warehouse.service.impl;

import org.apache.hertzbeat.common.entity.dto.query.DatasourceQuery;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQueryData;
import org.apache.hertzbeat.warehouse.db.QueryExecutor;
import org.apache.hertzbeat.warehouse.service.DatasourceQueryService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * datasource query service impl
 */
@Service
public class DatasourceQueryServiceImpl implements DatasourceQueryService {
    Map<String, QueryExecutor> executorMap;

    DatasourceQueryServiceImpl(List<QueryExecutor> executors) {
        executorMap = executors.stream().collect(Collectors.toMap(QueryExecutor::getDatasource, executor -> executor));
    }

    @Override
    public List<DatasourceQueryData> query(List<DatasourceQuery> queries) {
        if (queries == null) {
            throw new IllegalArgumentException("No query found");
        }
        List<DatasourceQueryData> datasourceQueryDataList = new ArrayList<>();
        for (DatasourceQuery datasourceQuery : queries) {
            QueryExecutor executor = executorMap.get(datasourceQuery.getDatasource());
            if (executor == null) {
                throw new IllegalArgumentException("Unsupported datasource: " + datasourceQuery.getDatasource());
            }
            datasourceQueryDataList.add(executor.query(datasourceQuery));
        }

        return datasourceQueryDataList;
    }
}
