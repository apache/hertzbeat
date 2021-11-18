package com.usthe.common.util;

import lombok.extern.slf4j.Slf4j;

/**
 * 数值区间表达式计算
 * [a,b] = {a <= x <= b}
 * [a,b) = {a <= x < b}
 * [a,+∞) = {a <= x}
 * (-∞,b] = {x <= b}
 * (-∞,a]||[b,+∞) = {x <= a || x >= b}
 * @author tomsun28
 * @date 2021/11/18 10:22
 */
@Slf4j
public class IntervalExpressionUtil {

    private static final String SPLIT_OR = "\\|\\|";
    private static final String SPLIT_AND = ",";
    private static final String SPLIT_EQU_LEFT = "(";
    private static final String SPLIT_EQU_RIGHT = ")";
    private static final String SPLIT_EQ_LEFT = "[";
    private static final String SPLIT_EQ_RIGHT = "]";
    private static final String NEGATIVE = "-∞";
    private static final String POSITIVE = "+∞";

    /**
     * 校验数值是否在区间范围
     * @param numberValue 数值
     * @param expression 区间表达式
     * @return true-是 false-否
     */
    public static boolean validNumberIntervalExpress(Double numberValue, String expression) {
        if (expression == null || "".equals(expression)) {
            return true;
        }
        if (numberValue == null) {
            return false;
        }
        try {
            String[] expressions = expression.split(SPLIT_OR);
            for (String expr : expressions) {
                String[] values = expr.substring(1, expr.length() - 1).split(SPLIT_AND);
                if (values.length != 2) {
                    continue;
                }
                Double[] doubleValues = new Double[2];
                if (NEGATIVE.equals(values[0])) {
                    doubleValues[0] = Double.MIN_VALUE;
                } else {
                    doubleValues[0] = Double.parseDouble(values[0]);
                }
                if (POSITIVE.equals(values[1])) {
                    doubleValues[1] = Double.MAX_VALUE;
                } else {
                    doubleValues[1] = Double.parseDouble(values[1]);
                }
                String startBracket = expr.substring(0, 1);
                String endBracket = expr.substring(expr.length() - 1);
                if (SPLIT_EQU_LEFT.equals(startBracket)) {
                    if (SPLIT_EQU_RIGHT.equals(endBracket)) {
                        if (numberValue > doubleValues[0] && numberValue < doubleValues[1]) {
                            return true;
                        }
                    } else if (SPLIT_EQ_RIGHT.equals(endBracket)) {
                        if (numberValue > doubleValues[0] && numberValue <= doubleValues[1]) {
                            return true;
                        }
                    }
                } else if (SPLIT_EQ_LEFT.equals(startBracket)) {
                    if (SPLIT_EQU_RIGHT.equals(endBracket)) {
                        if (numberValue >= doubleValues[0] && numberValue < doubleValues[1]) {
                            return true;
                        }
                    } else if (SPLIT_EQ_RIGHT.equals(endBracket)) {
                        if (numberValue >= doubleValues[0] && numberValue <= doubleValues[1]) {
                            return true;
                        }
                    }
                }
            }
            return false;
        } catch (Exception e) {
            log.debug(e.getMessage(), e);
            return false;
        }
    }
}
