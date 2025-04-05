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

package org.apache.hertzbeat.warehouse.db;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.dto.query.MetricQueryData;

import java.util.List;
import java.util.Map;

import static org.apache.hertzbeat.warehouse.constants.WarehouseConstants.SQL;

/**
 * abstract class for sql query executor
 */
@Slf4j
public abstract class SqlQueryExecutor implements QueryExecutor {

    private static final String supportQueryLanguage = SQL;

    /**
     * record class for sql connection
     */
    protected record ConnectorSqlProperties () {}

    protected abstract List<Map<String, Object>> do_sql(Map<String, Object> params);

    public MetricQueryData convertToMetricQueryData(Object object) {
        MetricQueryData metricQueryData = new MetricQueryData();
        try {
            List<Map<String, Object>> metrics = (List<Map<String, Object>>) object;
            // todo
        } catch (Exception e) {
            log.error("converting to metric query data failed.");
        }
        return metricQueryData;
    }

    public abstract List<Map<String, Object>> execute(String query);

    public abstract List<Map<String, Object>> query(String query, Long time);

    public abstract List<Map<String, Object>> query_range(String query, Long start, Long end, String step);


    public boolean support(String datasource) {
        return supportQueryLanguage.equals(datasource);
    }

}