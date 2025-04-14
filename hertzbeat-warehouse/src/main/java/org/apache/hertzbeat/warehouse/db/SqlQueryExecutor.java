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
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQuery;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQueryData;

import static org.apache.hertzbeat.warehouse.constants.WarehouseConstants.SQL;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;

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

    @Override
    public List<Map<String, Object>> execute(String query) {
        return null;
    }

    @Override
    public DatasourceQueryData query(DatasourceQuery datasourceQuery) {
        return null;
    }

    @Override
    public boolean support(String queryLanguage) {
        return StringUtils.hasText(queryLanguage) && queryLanguage.equalsIgnoreCase(supportQueryLanguage);
    }

}
