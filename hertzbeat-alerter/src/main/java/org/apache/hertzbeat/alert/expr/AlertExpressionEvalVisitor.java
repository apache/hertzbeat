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

package org.apache.hertzbeat.alert.expr;

import org.antlr.v4.runtime.CommonTokenStream;
import org.apache.hertzbeat.warehouse.db.QueryExecutor;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Alert expression visitor implement
 */
public class AlertExpressionEvalVisitor extends AlertExpressionBaseVisitor<List<Map<String, Object>>> {

    private static final String THRESHOLD = "__threshold__";
    private static final String NAME = "__name__";
    private static final String VALUE = "__value__";
    private static final String TIMESTAMP = "__timestamp__";

    private final QueryExecutor executor;
    private final CommonTokenStream tokens;

    public AlertExpressionEvalVisitor(QueryExecutor executor, CommonTokenStream tokens) {
        this.executor = executor;
        this.tokens = tokens;
    }

    @Override
    public List<Map<String, Object>> visitExpression(AlertExpressionParser.ExpressionContext ctx) {
        return visit(ctx.expr());
    }

    @Override
    public List<Map<String, Object>> visitParenExpr(AlertExpressionParser.ParenExprContext ctx) {
        return visit(ctx.expr());
    }

    @Override
    public List<Map<String, Object>> visitComparisonExpr(AlertExpressionParser.ComparisonExprContext ctx) {
        List<Map<String, Object>> leftResult = visit(ctx.left);
        List<Map<String, Object>> rightResult = visit(ctx.right);
        if (rightResult.size() == 1 && rightResult.get(0).containsKey(THRESHOLD)) {
            double threshold = (double) rightResult.get(0).get(THRESHOLD);
            String operator = ctx.op.getText();

            List<Map<String, Object>> result = new ArrayList<>();
            for (Map<String, Object> item : leftResult) {
                Object queryValues = item.get(VALUE);
                if (queryValues == null) {
                    // ignore the query result data is empty
                    continue;
                }
                // queryValues may be a list of values, or a single value
                Object matchValue = evaluateCondition(queryValues, operator, threshold);
                Map<String, Object> resultMap = new HashMap(item);
                resultMap.put(VALUE, matchValue);
                // if matchValue is null, mean not match the threshold
                // if not null, mean match the threshold
                result.add(resultMap);
            }
            return result;
        }
        return new LinkedList<>();
    }

    @Override
    public List<Map<String, Object>> visitAndExpr(AlertExpressionParser.AndExprContext ctx) {
        List<Map<String, Object>> leftOperand = visit(ctx.left);
        List<Map<String, Object>> rightOperand = visit(ctx.right);
        List<Map<String, Object>> results = new ArrayList<>();

        // build a hash set of the right-side tag collection
        Set<String> rightLabelsSet = rightOperand.stream()
                .filter(item -> item.get(VALUE) != null)
                .map(this::labelKey)
                .collect(Collectors.toSet());

        // iterate over the left side, O(1) match
        for (Map<String, Object> leftItem : leftOperand) {
            Object leftVal = leftItem.get(VALUE);
            if (leftVal == null) {
                continue;
            }
            String labelKey = labelKey(leftItem);
            if (rightLabelsSet.contains(labelKey)) {
                results.add(new HashMap<>(leftItem));
            }
        }
        return results;
    }

    @Override
    public List<Map<String, Object>> visitOrExpr(AlertExpressionParser.OrExprContext ctx) {
        List<Map<String, Object>> leftOperand = visit(ctx.left);
        List<Map<String, Object>> rightOperand = visit(ctx.right);

        // build a hashMap of the left-hand label collection
        Map<String, Map<String, Object>> leftLabelMap = leftOperand.stream()
                .filter(item -> item.get(VALUE) != null)
                .collect(Collectors.toMap(this::labelKey, HashMap::new, (k1, k2) -> k1));

        // first add all the non-empty items on the left side
        List<Map<String, Object>> results = new ArrayList<>(leftLabelMap.values());

        // add the term that has a value on the right side and not on the left side
        for (Map<String, Object> rightItem : rightOperand) {
            Object rightVal = rightItem.get(VALUE);
            if (rightVal == null) {
                continue;
            }
            String key = labelKey(rightItem);
            if (!leftLabelMap.containsKey(key)) {
                results.add(new HashMap<>(rightItem));
            }
        }
        return results;
    }

    @Override
    public List<Map<String, Object>> visitUnlessExpr(AlertExpressionParser.UnlessExprContext ctx) {
        List<Map<String, Object>> leftOperand = visit(ctx.left);
        List<Map<String, Object>> rightOperand = visit(ctx.right);
        List<Map<String, Object>> results = new ArrayList<>();

        // build a hash set of the right-side tag collection
        Set<String> rightLabelSet = rightOperand.stream()
                .filter(item -> item.get(VALUE) != null)
                .map(this::labelKey)
                .collect(Collectors.toSet());

        // iterate over the left side, O(1) match
        for (Map<String, Object> leftItem : leftOperand) {
            Object leftVal = leftItem.get(VALUE);
            if (leftVal == null) {
                continue;
            }
            if (!rightLabelSet.contains(labelKey(leftItem))) {
                results.add(new HashMap<>(leftItem));
            }
        }
        return results;
    }

    @Override
    public List<Map<String, Object>> visitLiteralExpr(AlertExpressionParser.LiteralExprContext ctx) {
        double value = Double.parseDouble(ctx.number().getText());
        List<Map<String, Object>> numAsList = new ArrayList<>();
        Map<String, Object> valueMap = new HashMap<>();
        valueMap.put(THRESHOLD, value);
        numAsList.add(valueMap);
        return numAsList;
    }

    @Override
    public List<Map<String, Object>> visitPromqlExpr(AlertExpressionParser.PromqlExprContext ctx) {
        String rawPromql = tokens.getText(ctx.promql());
        return executor.execute(rawPromql);
    }

    @Override
    public List<Map<String, Object>> visitSqlExpr(AlertExpressionParser.SqlExprContext ctx) {
        String rawSql = tokens.getText(ctx.selectSql());
        return executor.execute(rawSql);
    }

    @Override
    public List<Map<String, Object>> visitSqlCallExpr(AlertExpressionParser.SqlCallExprContext ctx) {
        return callSqlOrPromql(tokens.getText(ctx.string()));
    }

    @Override
    public List<Map<String, Object>> visitPromqlCallExpr(AlertExpressionParser.PromqlCallExprContext ctx) {
        return callSqlOrPromql(tokens.getText(ctx.string()));
    }

    private Object evaluateCondition(Object value, String operator, Double threshold) {
        // value may be a list of values, or a single value
        switch (operator) {
            case ">":
                // if value is list, return the max value
                if (value instanceof List<?> values) {
                    Double doubleValue = values.stream().map(v -> Double.valueOf(v.toString())).max(Double::compareTo).orElse(null);
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
                    Double doubleValue = values.stream().map(v -> Double.valueOf(v.toString())).max(Double::compareTo).orElse(null);
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
                    Double doubleValue = values.stream().map(v -> Double.valueOf(v.toString())).min(Double::compareTo).orElse(null);
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
                    Double doubleValue = values.stream().map(v -> Double.valueOf(v.toString())).min(Double::compareTo).orElse(null);
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

    private List<Map<String, Object>> callSqlOrPromql(String text){
        String script = text.substring(1, text.length() - 1);
        return executor.execute(script);
    }

    /**
     * Generate tag key (excluding `__name__` and `__value__` and `__timestamp__`)
     */
    private String labelKey(Map<String, Object> labelsMap) {
        if (null == labelsMap || labelsMap.isEmpty()) {
            return "-";
        }
        String key = labelsMap.entrySet().stream()
                .filter(e -> !e.getKey().equals(VALUE) && !e.getKey().equals(NAME) && !e.getKey().equals(TIMESTAMP))
                .sorted(Map.Entry.comparingByKey())
                .map(e -> e.getKey() + "=" + (e.getValue() == null ? "" : e.getValue()))
                .collect(Collectors.joining(","));
        return key.isEmpty() ? "-" : key;
    }

}