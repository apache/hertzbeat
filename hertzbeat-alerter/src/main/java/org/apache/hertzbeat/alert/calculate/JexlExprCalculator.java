/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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
