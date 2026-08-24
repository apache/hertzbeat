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

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.antlr.v4.runtime.CharStreams;
import org.antlr.v4.runtime.CommonTokenStream;
import org.antlr.v4.runtime.Token;
import org.antlr.v4.runtime.tree.ParseTree;
import org.apache.hertzbeat.alert.expr.AlertExpressionEvalVisitor;
import org.apache.hertzbeat.alert.expr.AlertExpressionLexer;
import org.apache.hertzbeat.alert.expr.AlertExpressionParser;
import org.apache.hertzbeat.alert.service.DataSourceService;
import org.apache.hertzbeat.common.support.exception.AlertExpressionException;
import org.apache.hertzbeat.common.support.valid.SqlSecurityValidator;
import org.apache.hertzbeat.common.util.ResourceBundleUtil;
import org.apache.hertzbeat.warehouse.constants.WarehouseConstants;
import org.apache.hertzbeat.warehouse.db.QueryExecutor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.ResourceBundle;
import java.util.concurrent.TimeUnit;

/**
 * datasource service
 */
@Service
@Slf4j
public class DataSourceServiceImpl implements DataSourceService {

    /**
     * Default allowed tables for SQL queries
     */
    private static final List<String> DEFAULT_ALLOWED_TABLES = List.of(WarehouseConstants.LOG_TABLE_NAME);

    /**
     * The policy for an alert expression is read only within the configured database. Metric
     * tables are created per metric on demand, so an exact table whitelist would reject every
     * legitimate metric query.
     */
    private static final SqlSecurityValidator EXPRESSION_SQL_VALIDATOR = SqlSecurityValidator.selectOnly();

    protected ResourceBundle bundle = ResourceBundleUtil.getBundle("alerter");

    @Setter
    private List<QueryExecutor> executors;

    private final SqlSecurityValidator sqlSecurityValidator;

    @Getter
    private final Cache<String, ParseTree> expressionCache = Caffeine.newBuilder()
            .maximumSize(256)
            .expireAfterAccess(1, TimeUnit.HOURS)
            .recordStats()
            .build();

    public DataSourceServiceImpl(@Autowired(required = false) List<QueryExecutor> executors) {
        this.executors = executors != null ? executors : Collections.emptyList();
        this.sqlSecurityValidator = new SqlSecurityValidator(DEFAULT_ALLOWED_TABLES);
    }

    @Override
    public List<Map<String, Object>> calculate(String datasource, String expr) {
        if (!StringUtils.hasText(expr)) {
            throw new IllegalArgumentException("Empty expression");
        }
        AlertQueryBudgetExecutor.validateInput(expr);
        if (executors == null || executors.isEmpty()) {
            throw new IllegalArgumentException(bundle.getString("alerter.datasource.executor.not.found"));
        }
        QueryExecutor executor = executors.stream().filter(e -> e.support(datasource)).findFirst().orElse(null);

        if (executor == null) {
            throw new IllegalArgumentException("Unsupported datasource: " + datasource);
        }
        // replace all white space
        expr = expr.replaceAll("\\s+", " ");
        try {
            return evaluate(expr, guardSql(new AlertQueryBudgetExecutor(executor), EXPRESSION_SQL_VALIDATOR));
        } catch (AlertExpressionException ae) {
            log.error("Calculate query parse error, datasource: {}, expr: {}, msg: {}", datasource, expr, ae.getMessage(), ae);
            throw ae;
        } catch (Exception e) {
            log.error("Error executing query on datasource {}: {}", datasource, e.getMessage());
            throw new RuntimeException("Query execution failed", e);
        }
    }

    @Override
    public List<Map<String, Object>> query(String datasource, String expr) {
        if (!StringUtils.hasText(expr)) {
            throw new IllegalArgumentException("Empty expression");
        }
        AlertQueryBudgetExecutor.validateInput(expr);
        if (executors == null || executors.isEmpty()) {
            throw new IllegalArgumentException(bundle.getString("alerter.datasource.executor.not.found"));
        }
        QueryExecutor executor = executors.stream().filter(e -> e.support(datasource)).findFirst().orElse(null);

        if (executor == null) {
            throw new IllegalArgumentException("Unsupported datasource: " + datasource);
        }
        // replace all white space
        expr = expr.replaceAll("\\s+", " ");

        try {
            return guardSql(new AlertQueryBudgetExecutor(executor), sqlSecurityValidator).execute(expr);
        } catch (AlertExpressionException ae) {
            // A statement the policy rejected, whose message names the part it broke.
            throw ae;
        } catch (Exception e) {
            log.error("Error executing query on datasource {}: {}", datasource, e.getMessage());
            throw new AlertExpressionException(e.getMessage());
        }
    }

    /**
     * Wraps an executor that speaks sql so that nothing runs on it unvalidated.
     *
     * <p>The decision is made from the executor rather than from the datasource string the
     * caller passed, because the executor is what actually holds the database credentials.
     * A datasource that does not speak sql is handed back untouched: a promql endpoint takes
     * a query string, not a statement, and running it through a sql parser would only reject
     * valid promql.
     * @param executor Executor chosen for this datasource
     * @param validator Policy to enforce, read only for expressions and whitelisting for raw log queries
     * @return The executor, guarded when it speaks sql
     */
    private QueryExecutor guardSql(QueryExecutor executor, SqlSecurityValidator validator) {
        if (!executor.support(WarehouseConstants.SQL)) {
            return executor;
        }
        return new SqlValidatingQueryExecutor(executor, validator);
    }

    private List<Map<String, Object>> evaluate(String expr, QueryExecutor executor) {
        CommonTokenStream tokens = createTokenStream(expr);
        AlertExpressionParser parser = new AlertExpressionParser(tokens);
        ParseTree tree = expressionCache.get(expr, e -> parser.expr());
        // Validate EOF only during the first parsing (when tokens.index > 0)
        // Skip EOF check when cache hit, as it has already been validated on the first pass.
        if (tokens.index() > 0 && tokens.LA(1) != Token.EOF) {
            throw new AlertExpressionException(bundle.getString("alerter.calculate.parse.error"));
        }
        AlertExpressionEvalVisitor visitor = new AlertExpressionEvalVisitor(executor, tokens);
        return visitor.visit(tree);
    }

    private CommonTokenStream createTokenStream(String expr) {
        AlertExpressionLexer lexer = new AlertExpressionLexer(CharStreams.fromString(expr));
        return new CommonTokenStream(lexer);
    }

    @Override
    public Map<String, Object> getAvailableExecutors() {
        boolean hasPromqlExecutor = false;
        boolean hasSqlExecutor = false;
        java.util.Set<String> availableExecutors = new java.util.HashSet<>();

        if (executors != null) {
            for (QueryExecutor executor : executors) {
                String datasource = executor.getDatasource();
                availableExecutors.add(datasource);

                // Check if executor supports promql
                if (executor.support(WarehouseConstants.PROMQL)) {
                    hasPromqlExecutor = true;
                }
                // Check if executor supports sql
                if (executor.support(WarehouseConstants.SQL)) {
                    hasSqlExecutor = true;
                }
            }
        }

        Map<String, Object> result = new java.util.HashMap<>(8);
        result.put("hasPromqlExecutor", hasPromqlExecutor);
        result.put("hasSqlExecutor", hasSqlExecutor);
        result.put("availableExecutors", availableExecutors);

        return result;
    }
}
