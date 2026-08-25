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

package org.apache.hertzbeat.alert.service.impl;

import org.apache.hertzbeat.common.entity.dto.query.DatasourceQuery;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQueryData;
import org.apache.hertzbeat.common.support.exception.AlertExpressionException;
import org.apache.hertzbeat.common.support.valid.SqlSecurityException;
import org.apache.hertzbeat.common.support.valid.SqlSecurityValidator;
import org.apache.hertzbeat.warehouse.db.QueryExecutor;

import java.util.List;
import java.util.Map;

/**
 * A sql executor that validates before it runs anything.
 *
 * <p>An alert expression reaches a query executor by several routes: the {@code sql("...")}
 * and {@code promql("...")} spellings both carry an arbitrary string, a bare select is
 * parsed by the expression grammar itself, and each of them is evaluated for the preview
 * endpoint and for the periodic evaluation loop alike. All of them end at
 * {@link QueryExecutor#execute(String)}, which runs the string with the server side database
 * credentials.
 *
 * <p>Guarding that one method rather than each route is what makes the check complete: the
 * spelling an expression happens to use does not decide whether the statement is checked,
 * the database it lands on does. It also means a route added later is covered without anyone
 * remembering to add a call.
 */
public class SqlValidatingQueryExecutor implements QueryExecutor {

    private final QueryExecutor delegate;

    private final SqlSecurityValidator validator;

    public SqlValidatingQueryExecutor(QueryExecutor delegate, SqlSecurityValidator validator) {
        this.delegate = delegate;
        this.validator = validator;
    }

    @Override
    public List<Map<String, Object>> execute(String query) {
        try {
            validator.validate(query);
        } catch (SqlSecurityException e) {
            // AlertExpressionException rather than a generic failure: it is the type
            // DataSourceServiceImpl rethrows untouched and the preview endpoint turns into a
            // 400, so the author of the rule sees which part of the policy the statement broke
            throw new AlertExpressionException("SQL security validation failed: " + e.getMessage());
        }
        return delegate.execute(query);
    }

    @Override
    public DatasourceQueryData query(DatasourceQuery datasourceQuery) {
        return delegate.query(datasourceQuery);
    }

    @Override
    public String getDatasource() {
        return delegate.getDatasource();
    }

    @Override
    public boolean support(String queryLanguage) {
        return delegate.support(queryLanguage);
    }
}
