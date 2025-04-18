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
import org.antlr.v4.runtime.tree.ParseTree;
import org.apache.hertzbeat.alert.expr.AlertExpressionEvalVisitor;
import org.apache.hertzbeat.alert.expr.AlertExpressionLexer;
import org.apache.hertzbeat.alert.expr.AlertExpressionParser;
import org.apache.hertzbeat.alert.service.DataSourceService;
import org.apache.hertzbeat.warehouse.db.QueryExecutor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * datasource service
 */
@Service
@Slf4j
public class DataSourceServiceImpl implements DataSourceService {

    @Setter
    @Autowired(required = false)
    private List<QueryExecutor> executors;

    @Getter
    private final Cache<String, ParseTree> expressionCache = Caffeine.newBuilder()
            .maximumSize(256)
            .expireAfterAccess(1, TimeUnit.HOURS)
            .recordStats()
            .build();

    @Getter
    private final Cache<String, CommonTokenStream> tokenStreamCache = Caffeine.newBuilder()
            .maximumSize(512)
            .expireAfterWrite(30, TimeUnit.MINUTES)
            .recordStats()
            .build();

    @Override
    public List<Map<String, Object>> calculate(String datasource, String expr) {
        if (!StringUtils.hasText(expr)) {
            throw new IllegalArgumentException("Empty expression");
        }
        if (executors == null || executors.isEmpty()) {
            throw new IllegalArgumentException("No query executor found");
        }
        QueryExecutor executor = executors.stream().filter(e -> e.support(datasource)).findFirst().orElse(null);

        if (executor == null) {
            throw new IllegalArgumentException("Unsupported datasource: " + datasource);
        }
        // replace all white space
        expr = expr.replaceAll("\\s+", " ");
        try {
            return evaluate(expr, executor);
        } catch (Exception e) {
            log.error("Error executing query on datasource {}: {}", datasource, e.getMessage());
            throw new RuntimeException("Query execution failed", e);
        }
    }

    private List<Map<String, Object>> evaluate(String expr, QueryExecutor executor) {
        ParseTree tree = expressionCache.get(expr, e -> {
            CommonTokenStream tokens = tokenStreamCache.get(e, this::createTokenStream);
            AlertExpressionParser parser = new AlertExpressionParser(tokens);
            return parser.expr();
        });
        AlertExpressionEvalVisitor visitor = new AlertExpressionEvalVisitor(executor);
        return visitor.visit(tree);

    }

    private CommonTokenStream createTokenStream(String expr) {
        AlertExpressionLexer lexer = new AlertExpressionLexer(CharStreams.fromString(expr));
        return new CommonTokenStream(lexer);
    }
}