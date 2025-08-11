package org.apache.hertzbeat.alert.calculate;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.jexl3.JexlException;
import org.apache.commons.jexl3.JexlExpression;
import org.apache.hertzbeat.common.util.JexlExpressionRunner;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * JexlExprCalculator is a utility class for evaluating JEXL expressions
 */
@Slf4j
@Component
public class JexlExprCalculator {
    /**
     * Execute an alert expression
     * @param fieldValueMap The field value map for expression evaluation
     * @param expr The expression to evaluate
     * @param ignoreJexlException Whether to ignore JEXL exceptions
     * @return true if the expression matches, false otherwise
     */
    public boolean execAlertExpression(Map<String, Object> fieldValueMap, String expr, boolean ignoreJexlException) {
        Boolean match;
        JexlExpression expression;
        try {
            expression = JexlExpressionRunner.compile(expr);
        } catch (JexlException jexlException) {
            log.warn("Alarm Rule: {} Compile Error: {}.", expr, jexlException.getMessage());
            throw jexlException;
        } catch (Exception e) {
            log.error("Alarm Rule: {} Unknown Error: {}.", expr, e.getMessage());
            throw e;
        }

        try {
            match = (Boolean) JexlExpressionRunner.evaluate(expression, fieldValueMap);
        } catch (JexlException jexlException) {
            if (ignoreJexlException) {
                log.debug("Alarm Rule: {} Run Error: {}.", expr, jexlException.getMessage());
            } else {
                log.error("Alarm Rule: {} Run Error: {}.", expr, jexlException.getMessage());
            }
            throw jexlException;
        } catch (Exception e) {
            log.error("Alarm Rule: {} Unknown Error: {}.", expr, e.getMessage());
            throw e;
        }
        return match != null && match;
    }

}
