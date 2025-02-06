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

import java.util.HashMap;
import java.util.LinkedList;
import java.util.Stack;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.service.DataSourceService;
import org.apache.hertzbeat.warehouse.db.QueryExecutor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.util.StringUtils;

/**
 * datasource service
 */
@Service
@Slf4j
public class DataSourceServiceImpl implements DataSourceService {
    
    @Autowired(required = false)
    private List<QueryExecutor> executors;
    
    private static final Pattern EXPR_TOKEN = Pattern.compile("\\(|\\)|[a-zA-Z_][a-zA-Z0-9_=～{}\\[\\]\".]*|\\d+(\\.\\d+)?|>=|<=|==|!=|>|<|and|or|unless");
    private static final String THRESHOLD = "__threshold__";
    private static final String VALUE = "__value__";
    
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
        Stack<List<Map<String, Object>>> values = new Stack<>();
        Stack<String> operators = new Stack<>();
        Matcher matcher = EXPR_TOKEN.matcher(expr);
        List<String> tokens = new ArrayList<>();
        while (matcher.find()) {
            tokens.add(matcher.group());
        }
        for (String token : tokens) {
            if (token.equals("(")) {
                operators.push(token);
            } else if (token.equals(")")) {
                while (!operators.isEmpty() && !operators.peek().equals("(")) {
                    applyOperator(values, operators.pop());
                }
                // remove the left parenthesis
                operators.pop();
            } else if (token.matches(">=|<=|==|!=|>|<")) {
                operators.push(token);
            } else if (token.equals("and") || token.equals("or") || token.equals("unless")) {
                while (!operators.isEmpty() && precedence(operators.peek()) >= precedence(token)) {
                    applyOperator(values, operators.pop());
                }
                operators.push(token);
            } else if (token.matches("\\d+(\\.\\d+)?")) { 
                double value = Double.parseDouble(token);
                List<Map<String, Object>> numAsList = new ArrayList<>();
                numAsList.add(Map.of(THRESHOLD, value));
                values.push(numAsList);
            } else if (token.matches("[a-zA-Z_][a-zA-Z0-9_=～{}\\[\\]\".]*")) {
                List<Map<String, Object>> results = executor.execute(token);
                values.push(results);
            }
        }
        while (!operators.isEmpty()) {
            applyOperator(values, operators.pop());
        }
        return values.isEmpty() ? new LinkedList<>() : values.pop();
    }

    private int precedence(String op) {
        return switch (op) {
            case "or" -> 1;
            case "unless" -> 2;
            case "and" -> 3;
            case ">", "<", ">=", "<=", "==", "!=" -> 4;
            default -> 0;
        };
    }

    private void applyOperator(Stack<List<Map<String, Object>>> values, String op) {
        if (values.size() < 2) {
            return;
        };
        List<Map<String, Object>> rightOperand = values.pop();
        List<Map<String, Object>> leftOperand = values.pop();
        if (rightOperand.size() == 1 && rightOperand.get(0).containsKey(THRESHOLD)) {
            double threshold = (double) rightOperand.get(0).get(THRESHOLD);
            List<Map<String, Object>> result = new ArrayList<>();
            for (Map<String, Object> item : leftOperand) {
                Object queryValues = item.get(VALUE);
                if (queryValues == null) {
                    // ignore the query result data is empty
                    continue;
                }
                // queryValues may be a list of values, or a single value
                Object matchValue = evaluateCondition(queryValues, op, threshold);
                item.put(VALUE, matchValue);
                // if matchValue is null, mean not match the threshold
                // if not null, mean match the threshold
                result.add(new HashMap<>(item));
            }
            if (!result.isEmpty()) {
                values.push(result);    
            }
            return;
        }
        Map<String, Object> leftMap = null;
        boolean leftMatch = false;
        Map<String, Object> rightMap = null;
        boolean rightMatch = false;
        switch (op) {
            case "and" -> {
                for (Map<String, Object> item : leftOperand) {
                    if (leftMap == null) {
                        leftMap = item;
                    }
                    if (item.get(VALUE) != null) {
                        leftMap = item;
                        leftMatch = true;
                        break;
                    }
                }
                for (Map<String, Object> item : rightOperand) {
                    if (rightMap == null) {
                        rightMap = item;
                    }
                    if (item.get(VALUE) != null) {
                        rightMap = item;
                        rightMatch = true;
                        break;
                    }
                }
                if (leftMatch && rightMatch) {
                    rightMap.putAll(leftMap);
                    values.push(new LinkedList<>(List.of(rightMap)));
                } else if (leftMap != null) {
                    leftMap.put(VALUE, null);
                    values.push(new LinkedList<>(List.of(leftMap)));
                } else if (rightMap != null) {
                    rightMap.put(VALUE, null);
                    values.push(new LinkedList<>(List.of(rightMap)));
                } 
            }
            case "or" -> {
                for (Map<String, Object> item : leftOperand) {
                    if (leftMap == null) {
                        leftMap = item;
                    }
                    if (item.get(VALUE) != null) {
                        leftMap = item;
                        leftMatch = true;
                        break;
                    }
                }
                for (Map<String, Object> item : rightOperand) {
                    if (rightMap == null) {
                        rightMap = item;
                    }
                    if (item.get(VALUE) != null) {
                        rightMap = item;
                        rightMatch = true;
                        break;
                    }
                }
                if (leftMatch && rightMatch) {
                    rightMap.putAll(leftMap);
                    values.push(new LinkedList<>(List.of(rightMap)));
                } else if (leftMatch) {
                    values.push(new LinkedList<>(List.of(leftMap)));
                } else if (rightMatch) {
                    values.push(new LinkedList<>(List.of(rightMap)));
                } else {
                    if (leftMap != null && rightMap != null) {
                        rightMap.putAll(leftMap);
                        values.push(new LinkedList<>(List.of(rightMap)));
                    } else if (leftMap != null) {
                        values.push(new LinkedList<>(List.of(leftMap)));
                    } else if (rightMap != null){
                        values.push(new LinkedList<>(List.of(rightMap)));
                    }
                }
            }
            case "unless" -> {
                for (Map<String, Object> item : leftOperand) {
                    if (leftMap == null) {
                        leftMap = item;
                    }
                    if (item.get(VALUE) != null) {
                        leftMap = item;
                        leftMatch = true;
                        break;
                    }
                }
                for (Map<String, Object> item : rightOperand) {
                    if (rightMap == null) {
                        rightMap = item;
                    }
                    if (item.get(VALUE) != null) {
                        rightMap = item;
                        rightMatch = true;
                        break;
                    }
                }
                if (leftMatch && !rightMatch) {
                    values.push(new LinkedList<>(List.of(leftMap)));
                } else {
                    if (leftMap != null) {
                        leftMap.put(VALUE, null);
                        values.push(new LinkedList<>(List.of(leftMap)));
                    } else {
                        if (rightMap != null) {
                            rightMap.put(VALUE, null);
                            values.push(new LinkedList<>(List.of(rightMap)));
                        } 
                    }
                }
            }
            default -> throw new IllegalArgumentException("Unsupported operator: " + op);
        }
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

    public void setExecutors(List<QueryExecutor> mockExecutor) {
        this.executors = mockExecutor;
    }
} 
