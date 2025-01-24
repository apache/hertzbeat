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

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.service.DataSourceService;
import org.apache.hertzbeat.warehouse.db.QueryExecutor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.apache.commons.lang3.tuple.Pair;

import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * datasource service
 */
@Service
@Slf4j
public class DataSourceServiceImpl implements DataSourceService {
    
    @Autowired(required = false)
    private List<QueryExecutor> executors;
    
    private static final Pattern EXPR_PATTERN = Pattern.compile("^(.*?)([><]=?|==|!=)\\s*(\\d+(\\.\\d+)?)$");
    
    @Override
    public List<Map<String, Object>> calculate(String datasource, String expr) {
        if (executors == null || executors.isEmpty()) {
            throw new IllegalArgumentException("No query executor found");
        }
        QueryExecutor executor = executors.stream().filter(e -> e.support(datasource)).findFirst().orElse(null);
        if (executor == null) {
            throw new IllegalArgumentException("Unsupported datasource: " + datasource);
        }
        
        // todo support multiple expr: and or logic operation
        Pair<String, Pair<String, Double>> parsedExpr = parseExpression(expr);
        String query = parsedExpr.getLeft();
        String operator = parsedExpr.getRight().getLeft();
        Double threshold = parsedExpr.getRight().getRight();
        try {
            List<Map<String, Object>> results = executor.execute(query);
            return evaluateResults(results, operator, threshold);
        } catch (Exception e) {
            log.error("Error executing query on datasource {}: {}", datasource, e.getMessage());
            throw new RuntimeException("Query execution failed", e);
        }
    }
    
    private Pair<String, Pair<String, Double>> parseExpression(String expr) {
        Matcher matcher = EXPR_PATTERN.matcher(expr.trim());
        if (matcher.find()) {
            // promql, sql expr
            String query = matcher.group(1).trim(); 
            // operator
            String operator = matcher.group(2).trim();
            // value
            Double threshold = Double.valueOf(matcher.group(3).trim()); 
            return Pair.of(query, Pair.of(operator, threshold));
        } else {
            throw new IllegalArgumentException("Invalid expression format: " + expr);
        }
    }
    
    private List<Map<String, Object>> evaluateResults(List<Map<String, Object>> results, String operator, Double threshold) {
        List<Map<String, Object>> filteredResults = new ArrayList<>();
        for (Map<String, Object> result : results) {
            Object values = result.get("__value__");
            if (values == null) {
                // ignore the query result data is empty
                continue;
            }
            // values may be a list of values, or a single value
            Object matchValue = evaluateCondition(values, operator, threshold);
            result.put("__value__", matchValue);
            // if matchValue is null, mean not match the threshold
            // if not null, mean match the threshold
            filteredResults.add(result);
        }
        return filteredResults;
    }
    
    private Object evaluateCondition(Object value, String operator, Double threshold) {
        // value may be a list of values, or a single value
        switch (operator) {
            case ">":
                // if value is list, return the max value
                if (value instanceof List<?> values) {
                    Double doubleValue = values.stream().map(v -> Double.valueOf(v.toString()))
                            .max(Double::compareTo).orElse(null);
                    if (doubleValue != null) {
                        return doubleValue > threshold ? doubleValue : null;
                    } else {
                        return null;
                    }
                } else {
                    return Double.parseDouble(value.toString()) > threshold ? value : null;
                }
            case ">=":
                if (value instanceof List<?> values) {
                    Double doubleValue = values.stream().map(v -> Double.valueOf(v.toString()))
                            .max(Double::compareTo).orElse(null);
                    if (doubleValue != null) {
                        return doubleValue >= threshold ? doubleValue : null;
                    } else {
                        return null;
                    }
                } else {
                    return Double.parseDouble(value.toString()) >= threshold ? value : null;
                }
            case "<":
                if (value instanceof List<?> values) {
                    Double doubleValue = values.stream().map(v -> Double.valueOf(v.toString()))
                            .min(Double::compareTo).orElse(null);
                    if (doubleValue != null) {
                        return doubleValue < threshold ? doubleValue : null;
                    } else {
                        return null;
                    }
                } else {
                    return Double.parseDouble(value.toString()) < threshold ? value : null;
                }
            case "<=":
                if (value instanceof List<?> values) {
                    Double doubleValue = values.stream().map(v -> Double.valueOf(v.toString()))
                            .min(Double::compareTo).orElse(null);
                    if (doubleValue != null) {
                        return doubleValue <= threshold ? doubleValue : null;
                    } else {
                        return null;
                    }
                } else {
                    return Double.parseDouble(value.toString()) <= threshold ? value : null;
                }
            case "==":
                if (value instanceof List<?> values) {
                    for (Object v : values) {
                        if (v.equals(threshold)) {
                            return v;
                        }
                    }
                    return null;
                } else {
                    return value.equals(threshold) ? value : null;
                }
            case "!=":
                if (value instanceof List<?> values) {
                    for (Object v : values) {
                        if (v.equals(threshold)) {
                            return null;
                        }
                    }
                    return value;
                } else {
                    return value.equals(threshold) ? null : value;
                }
            default:
                // unsupported operator todo add more operator
                return null;
        }
    }
} 
