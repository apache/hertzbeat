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

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Metrics Periodic Alert Calculator
 */
@Slf4j
@Component
public class MetricsPeriodicAlertCalculator extends AbstractPeriodicAlertCalculator {
    
    private static final String VALUE = "__value__";
    private static final String TIMESTAMP = "__timestamp__";

    private final DataSourceService dataSourceService;

    public MetricsPeriodicAlertCalculator(DataSourceService dataSourceService, AlarmCommonReduce alarmCommonReduce,
                                          AlarmCacheManager alarmCacheManager, JexlExprCalculator jexlExprCalculator) {
        super(alarmCommonReduce, alarmCacheManager, jexlExprCalculator);
        this.dataSourceService = dataSourceService;
    }

    @Override
    protected void doCalculate(AlertDefine define, long currentTimeMilli) {
        try {
            List<Map<String, Object>> results = dataSourceService.calculate(
                define.getDatasource(),
                define.getExpr()
            );
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
                    if (entry.getValue() != null && !VALUE.equals(entry.getKey())
                            && !TIMESTAMP.equals(entry.getKey())) {
                        fingerPrints.put(entry.getKey(), entry.getValue().toString());
                    }
                }
                
                if (result.get(VALUE) == null) {
                    // Recovery the alert
                    handleRecoveredAlert(define.getId(), fingerPrints);
                    continue;
                }
                
                Map<String, Object> fieldValueMap = new HashMap<>(8);
                fieldValueMap.putAll(define.getLabels());
                fieldValueMap.put(CommonConstants.LABEL_ALERT_NAME, define.getName());
                for (Map.Entry<String, Object> entry : result.entrySet()) {
                    if (entry.getValue() != null) {
                        fieldValueMap.put(entry.getKey(), entry.getValue());
                    }
                }
                afterThresholdRuleMatch(currentTimeMilli, fingerPrints, fieldValueMap, define);
            }
        } catch (Exception ignored) {
            // Ignore the query exception eg: no result, timeout, etc
        }
    }

}