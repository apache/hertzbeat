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

/**
 * Alert expression visitor implement
 */
public class AlertExpressionEvalVisitor extends AlertExpressionBaseVisitor<List<Map<String, Object>>> {

    private static final String THRESHOLD = "__threshold__";
    private static final String VALUE = "__value__";

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

        Map<String, Object> leftMap = null;
        boolean leftMatch = false;
        Map<String, Object> rightMap = null;
        boolean rightMatch = false;
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
            return new LinkedList<>(List.of(rightMap));
        } else if (leftMap != null) {
            leftMap.put(VALUE, null);
            return new LinkedList<>(List.of(leftMap));
        } else if (rightMap != null) {
            rightMap.put(VALUE, null);
            return new LinkedList<>(List.of(rightMap));
        }
        return new LinkedList<>();
    }

    @Override
    public List<Map<String, Object>> visitOrExpr(AlertExpressionParser.OrExprContext ctx) {
        List<Map<String, Object>> leftOperand = visit(ctx.left);
        List<Map<String, Object>> rightOperand = visit(ctx.right);

        Map<String, Object> leftMap = null;
        boolean leftMatch = false;
        Map<String, Object> rightMap = null;
        boolean rightMatch = false;
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
            return new LinkedList<>(List.of(rightMap));
        } else if (leftMatch) {
            return new LinkedList<>(List.of(leftMap));
        } else if (rightMatch) {
            return new LinkedList<>(List.of(rightMap));
        } else {
            if (leftMap != null && rightMap != null) {
                rightMap.putAll(leftMap);
                return new LinkedList<>(List.of(rightMap));
            } else if (leftMap != null) {
                return new LinkedList<>(List.of(leftMap));
            } else if (rightMap != null) {
                return new LinkedList<>(List.of(rightMap));
            }
        }
        return new LinkedList<>();
    }

    @Override
    public List<Map<String, Object>> visitUnlessExpr(AlertExpressionParser.UnlessExprContext ctx) {
        List<Map<String, Object>> leftOperand = visit(ctx.left);
        List<Map<String, Object>> rightOperand = visit(ctx.right);
        Map<String, Object> leftMap = null;
        boolean leftMatch = false;
        Map<String, Object> rightMap = null;
        boolean rightMatch = false;
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
            return new LinkedList<>(List.of(leftMap));
        } else {
            if (leftMap != null) {
                leftMap.put(VALUE, null);
                return new LinkedList<>(List.of(leftMap));
            } else {
                if (rightMap != null) {
                    rightMap.put(VALUE, null);
                    return new LinkedList<>(List.of(rightMap));
                }
            }
        }
        return new LinkedList<>();
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
}
