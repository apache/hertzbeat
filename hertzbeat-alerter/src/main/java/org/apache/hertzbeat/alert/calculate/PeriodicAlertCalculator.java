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

package org.apache.hertzbeat.alert.calculate;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.DataSourceService;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.collections4.CollectionUtils;
import org.springframework.stereotype.Component;

/**
 * Periodic Alert Calculator
 */

@Slf4j
@Component
public class PeriodicAlertCalculator {

    private final DataSourceService dataSourceService;
    private final AlarmCommonReduce alarmCommonReduce;
    private final Map<String, SingleAlert> notRecoveredAlertMap = new ConcurrentHashMap<>(16);
    
    public PeriodicAlertCalculator(DataSourceService dataSourceService, AlarmCommonReduce alarmCommonReduce) {
        this.dataSourceService = dataSourceService;
        this.alarmCommonReduce = alarmCommonReduce;
    }
    
    public void calculate(AlertDefine rule) {
        if (!rule.isEnable() || StringUtils.isEmpty(rule.getExpr())) {
            log.error("Periodic rule {} is disabled or expression is empty", rule.getName());
            return;
        }
        try {
            // Execute query
            List<Map<String, Object>> queryResults = dataSourceService.query(
                rule.getDatasource(), 
                rule.getExpr()
            );
            
            if (CollectionUtils.isEmpty(queryResults)) {
                return;
            }
            
            // todo Execute expression calculation on query results
            SingleAlert firingAlert = SingleAlert.builder()
                    .build();
            alarmCommonReduce.reduceAndSendAlarm(firingAlert);
        } catch (Exception e) {
            log.error("Calculate periodic rule {} failed: {}", rule.getName(), e.getMessage());
        }
    }
} 
