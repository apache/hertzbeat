package org.apache.hertzbeat.alert.dsl;

import org.apache.hertzbeat.warehouse.db.QueryExecutor;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

/**
 *  Alert threshold expression visitor implement
 */
public class ThresholdExpressionVisitorImpl extends ThresholdExpressionBaseVisitor<List<Map<String, Object>>> {

    private static final String THRESHOLD = "__threshold__";
    private static final String VALUE = "__value__";

    private final QueryExecutor executor;

    public ThresholdExpressionVisitorImpl(QueryExecutor executor) {
        this.executor = executor;
    }

    @Override
    public List<Map<String, Object>> visitParenExpr(ThresholdExpressionParser.ParenExprContext ctx) {
        return visit(ctx.expr());
    }

    @Override
    public List<Map<String, Object>> visitLogicalExpr(ThresholdExpressionParser.LogicalExprContext ctx) {
        List<Map<String, Object>> leftResult = visit(ctx.left);
        List<Map<String, Object>> rightResult = visit(ctx.right);

        String operator = ctx.op.getText();

        Map<String, Object> leftMap = null;
        boolean leftMatch = false;
        Map<String, Object> rightMap = null;
        boolean rightMatch = false;

        // Find matching values from left and right results
        for (Map<String, Object> item : leftResult) {
            if (leftMap == null) {
                leftMap = item;
            }
            if (item.get(VALUE) != null) {
                leftMap = item;
                leftMatch = true;
                break;
            }
        }

        for (Map<String, Object> item : rightResult) {
            if (rightMap == null) {
                rightMap = item;
            }
            if (item.get(VALUE) != null) {
                rightMap = item;
                rightMatch = true;
                break;
            }
        }

        List<Map<String, Object>> result = new LinkedList<>();

        if ("and".equals(operator)) {
            if (leftMatch && rightMatch) {
                Map<String, Object> combinedMap = new HashMap<>(rightMap);
                combinedMap.putAll(leftMap);
                result.add(combinedMap);
            } else if (leftMap != null) {
                Map<String, Object> mapCopy = new HashMap<>(leftMap);
                mapCopy.put(VALUE, null);
                result.add(mapCopy);
            } else if (rightMap != null) {
                Map<String, Object> mapCopy = new HashMap<>(rightMap);
                mapCopy.put(VALUE, null);
                result.add(mapCopy);
            }
        } else if ("or".equals(operator)) {
            if (leftMatch && rightMatch) {
                Map<String, Object> combinedMap = new HashMap<>(rightMap);
                combinedMap.putAll(leftMap);
                result.add(combinedMap);
            } else if (leftMatch) {
                result.add(new HashMap<>(leftMap));
            } else if (rightMatch) {
                result.add(new HashMap<>(rightMap));
            } else {
                if (leftMap != null && rightMap != null) {
                    Map<String, Object> combinedMap = new HashMap<>(rightMap);
                    combinedMap.putAll(leftMap);
                    result.add(combinedMap);
                } else if (leftMap != null) {
                    result.add(new HashMap<>(leftMap));
                } else if (rightMap != null) {
                    result.add(new HashMap<>(rightMap));
                }
            }
        }

        return result;
    }

    @Override
    public List<Map<String, Object>> visitUnlessExpr(ThresholdExpressionParser.UnlessExprContext ctx) {
        List<Map<String, Object>> leftResult = visit(ctx.left);
        List<Map<String, Object>> rightResult = visit(ctx.right);

        Map<String, Object> leftMap = null;
        boolean leftMatch = false;
        Map<String, Object> rightMap = null;
        boolean rightMatch = false;

        // Find matching values from left and right results
        for (Map<String, Object> item : leftResult) {
            if (leftMap == null) {
                leftMap = item;
            }
            if (item.get(VALUE) != null) {
                leftMap = item;
                leftMatch = true;
                break;
            }
        }

        for (Map<String, Object> item : rightResult) {
            if (rightMap == null) {
                rightMap = item;
            }
            if (item.get(VALUE) != null) {
                rightMap = item;
                rightMatch = true;
                break;
            }
        }

        List<Map<String, Object>> result = new LinkedList<>();

        if (leftMatch && !rightMatch) {
            result.add(new HashMap<>(leftMap));
        } else {
            if (leftMap != null) {
                Map<String, Object> mapCopy = new HashMap<>(leftMap);
                mapCopy.put(VALUE, null);
                result.add(mapCopy);
            } else if (rightMap != null) {
                Map<String, Object> mapCopy = new HashMap<>(rightMap);
                mapCopy.put(VALUE, null);
                result.add(mapCopy);
            }
        }

        return result;
    }

    @Override
    public List<Map<String, Object>> visitComparisonExpr(ThresholdExpressionParser.ComparisonExprContext ctx) {
        String identifier = ctx.identifier().getText();
        String operator = ctx.op.getText();
        double threshold = Double.parseDouble(ctx.number().getText());

        List<Map<String, Object>> queryResults = executor.execute(identifier);
        List<Map<String, Object>> result = new ArrayList<>();

        for (Map<String, Object> item : queryResults) {
            Object queryValues = item.get(VALUE);
            if (queryValues == null) {
                // Ignore empty results
                continue;
            }

            Object matchValue = evaluateCondition(queryValues, operator, threshold);
            Map<String, Object> resultItem = new HashMap<>(item);
            resultItem.put(VALUE, matchValue);
            // if matchValue is null, mean not match the threshold
            // if not null, mean match the threshold
            result.add(resultItem);
        }
        return result;
    }

    @Override
    public List<Map<String, Object>> visitQueryExpr(ThresholdExpressionParser.QueryExprContext ctx) {
        String identifier = ctx.identifier().getText();
        return executor.execute(identifier);
    }

    @Override
    public List<Map<String, Object>> visitLiteralExpr(ThresholdExpressionParser.LiteralExprContext ctx) {
        double value = Double.parseDouble(ctx.number().getText());
        List<Map<String, Object>> result = new ArrayList<>();
        result.add(Map.of(THRESHOLD, value));
        return result;
    }

    private Object evaluateCondition(Object value, String operator, Double threshold) {
        // Reuse the existing evaluateCondition method
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
                return null;
        }
    }
}