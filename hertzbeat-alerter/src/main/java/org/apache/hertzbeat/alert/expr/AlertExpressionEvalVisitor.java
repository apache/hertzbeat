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
import org.apache.commons.collections4.CollectionUtils;
import org.apache.hertzbeat.common.support.exception.ExpressionVisitorException;
import org.apache.hertzbeat.warehouse.db.QueryExecutor;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Alert expression visitor implement
 */
public class AlertExpressionEvalVisitor extends AlertExpressionBaseVisitor<List<Map<String, Object>>> {

    private static final String SCALAR = "__scalar__";
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
        int type = ctx.op.getType();
        boolean boolModifier = ctx.BOOL() != null;
        boolean leftIsScalar = isScalar(leftResult);
        boolean rightIsScalar = isScalar(rightResult);
        List<Map<String, Object>> results = new ArrayList<>();

        // scalar and scalar
        if (leftIsScalar && rightIsScalar) {
            if (!boolModifier) {
                // Between two scalars,
                // the bool modifier must be provided and these operators result in another scalar that is either 0 (false) or 1 (true), depending on the comparison result.
                return results;
            }
            Object leftVal = leftResult.get(0).get(SCALAR);
            Object rightVal = rightResult.get(0).get(SCALAR);
            Boolean match = compareOp(leftVal, type, rightVal);
            // returns a result only if the comparison condition is met.
            Map<String, Object> result = new HashMap<>();
            result.put(VALUE, match ? 1 : 0);
            results.add(result);
            return results;
        }

        // scalar and vector
        if (leftIsScalar) {
            Object leftVal = leftResult.get(0).get(SCALAR);
            for (Map<String, Object> rightItem : rightResult) {
                Object rightVal = rightItem.getOrDefault(VALUE, null);
                if (isValidValue(rightVal)) {
                    continue;
                }
                Boolean match = compareOp(leftVal, type, rightVal);
                Map<String, Object> result = new HashMap<>(rightItem);
                if (boolModifier) {
                    result.put(VALUE, match ? 1 : 0);
                    results.add(result);
                } else {
                    result.put(VALUE, match ? rightVal : null);
                    results.add(result);
                }
            }
            return results;
        }

        // vector and scalar
        if (rightIsScalar) {
            Object rightVal = rightResult.get(0).get(SCALAR);
            for (Map<String, Object> leftItem : leftResult) {
                Object leftVal = leftItem.getOrDefault(VALUE, null);
                if (isValidValue(leftVal)) {
                    continue;
                }
                Boolean match = compareOp(leftVal, type, rightVal);
                Map<String, Object> result = new HashMap<>(leftItem);
                if (boolModifier) {
                    result.put(VALUE, match ? 1 : 0);
                    results.add(result);
                } else {
                    result.put(VALUE, match ? leftVal : null);
                    results.add(result);
                }
            }
            return results;
        }

        // vector and vector
        Map<String, Map<String, Object>> rightMap = rightResult.stream()
                .filter(item -> item.get(VALUE) != null)
                .collect(Collectors.toMap(this::labelKey, item -> item, (existing, replacement) -> existing));

        for (Map<String, Object> leftItem : leftResult) {
            Object leftVal = leftItem.getOrDefault(VALUE, null);
            if (isValidValue(leftVal)) {
                continue;
            }
            Map<String, Object> rightItem = rightMap.get(labelKey(leftItem));
            if (rightItem == null) {
                continue;
            }
            Object rightVal = rightItem.get(VALUE);
            if (isValidValue(rightVal)) {
                continue;
            }
            Boolean match = compareOp(leftVal, type, rightVal);
            Map<String, Object> result = new HashMap<>(leftItem);
            if (boolModifier) {
                result.put(VALUE, match ? 1 : 0);
                results.add(result);
            } else {
                result.put(VALUE, match ? leftVal : null);
                results.add(result);
            }
        }
        return results;
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
        valueMap.put(SCALAR, value);
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

    private List<Map<String, Object>> callSqlOrPromql(String text) {
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

    private boolean isScalar(List<Map<String, Object>> context) {
        return CollectionUtils.isNotEmpty(context)
                && context.size() == 1
                && context.get(0).containsKey(SCALAR)
                && null != context.get(0).get(SCALAR);
    }

    private double parseStrToDouble(String text) {
        try {
            return Double.parseDouble(text);
        } catch (NumberFormatException e) {
            throw new ExpressionVisitorException("number format exception", e);
        }
    }

    private boolean isValidValue(Object val) {
        return val == null || val instanceof List<?>;
    }

    private Boolean compareOp(Object leftVal, int opType, Object rightVal) {
        double left = parseStrToDouble(leftVal.toString());
        double right = parseStrToDouble(rightVal.toString());
        return switch (opType) {
            case AlertExpressionParser.GT -> left > right;
            case AlertExpressionParser.GE -> left >= right;
            case AlertExpressionParser.LT -> left < right;
            case AlertExpressionParser.LE -> left <= right;
            case AlertExpressionParser.EQ -> left == right;
            case AlertExpressionParser.NE -> left != right;
            default -> false;
        };
    }
}