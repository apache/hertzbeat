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

package org.apache.hertzbeat.alert.calculate.periodic;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.hertzbeat.alert.calculate.AlarmCacheManager;
import org.apache.hertzbeat.alert.calculate.JexlExprCalculator;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.DataSourceService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Log Periodic Alert Calculator
 */
@Slf4j
@Component
public class LogPeriodicAlertCalculator extends AbstractPeriodicAlertCalculator {
    
    private static final String TIMESTAMP = "__timestamp__";
    private static final String ROWS = "__rows__";

    private final DataSourceService dataSourceService;

    public LogPeriodicAlertCalculator(DataSourceService dataSourceService, AlarmCommonReduce alarmCommonReduce,
                                      AlarmCacheManager alarmCacheManager, JexlExprCalculator jexlExprCalculator) {
        super(alarmCommonReduce, alarmCacheManager, jexlExprCalculator);
        this.dataSourceService = dataSourceService;
    }

    @Override
    protected void doCalculate(AlertDefine define, long currentTimeMilli) {
        try {
            // Log-based queries are SQL queries with log-specific expressions
            List<Map<String, Object>> results = dataSourceService.query(define.getDatasource(), define.getQueryExpr());
            results = this.calculateLogThreshold(results, define.getExpr());
            
            // If no match the expr threshold, the results item map {'value': null} should be null and others field keep
            // If results has multi list, should trigger multi alert
            if (CollectionUtils.isEmpty(results)) {
                return;
            }
            
            for (Map<String, Object> result : results) {
                Map<String, String> fingerPrints = new HashMap<>(8);
                // Here use the alert name as finger, not care the alert name may be changed
                fingerPrints.put(CommonConstants.LABEL_DEFINE_ID, String.valueOf(define.getId()));
                fingerPrints.put(CommonConstants.LABEL_ALERT_NAME, define.getName());
                fingerPrints.putAll(define.getLabels());
                for (Map.Entry<String, Object> entry : result.entrySet()) {
                    if (entry.getValue() != null) {
                        fingerPrints.put(entry.getKey(), entry.getValue().toString());
                    }
                }
                Map<String, Object> fieldValueMap = new HashMap<>(fingerPrints);
                afterThresholdRuleMatch(currentTimeMilli, fingerPrints, fieldValueMap, define);
            }
        } catch (Exception ignored) {
            // Ignore the query exception eg: no result, timeout, etc
        }
    }

    /**
     * Calculate log threshold evaluation
     * @param results Query results from log datasource
     * @param expression Alert expression for log analysis
     * @return Filtered results that match the log threshold
     */
    private List<Map<String, Object>> calculateLogThreshold(List<Map<String, Object>> results, String expression) {
        if (CollectionUtils.isEmpty(results)) {
            return List.of();
        }
        List<Map<String, Object>> newResults = new ArrayList<>(results.size());
        for (Map<String, Object> result : results) {
            HashMap<String, Object> fieldMap = new HashMap<>(result);
            fieldMap.put(ROWS, results.size());
            boolean match = jexlExprCalculator.execAlertExpression(fieldMap, expression, true);
            if (match) {
                newResults.add(result);
            }
        }
        return newResults;
    }
}