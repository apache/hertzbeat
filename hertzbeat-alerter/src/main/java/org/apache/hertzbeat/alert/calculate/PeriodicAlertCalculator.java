package org.apache.hertzbeat.alert.calculate;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.service.DataSourceService;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.util.JexlExpressionRunner;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.Collections;
import java.util.concurrent.ConcurrentHashMap;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.collections4.CollectionUtils;

/**
 * Periodic Alert Calculator
 */

@Slf4j
@RequiredArgsConstructor
public class PeriodicAlertCalculator {

    private final DataSourceService dataSourceService;
    private final JexlExpressionRunner expressionRunner;
    private final Map<String, SingleAlert> notRecoveredAlertMap = new ConcurrentHashMap<>(16);
    
    
    public List<SingleAlert> calculate(AlertDefine rule) {
        if (!rule.isEnabled() || StringUtils.isEmpty(rule.getExpr())) {
            return Collections.emptyList();
        }
        // todo: implement the following logic
        try {
            // Execute query
            List<Map<String, Object>> queryResults = dataSourceService.query(
                rule.getDatasource(), 
                rule.getExpr()
            );
            
            if (CollectionUtils.isEmpty(queryResults)) {
                return Collections.emptyList();
            }
            
            // Execute expression calculation on query results
            List<SingleAlert> newAlerts = queryResults.stream()
                .filter(result -> execAlertExpression(result, rule.getExpr()))
                .map(result -> buildAlert(rule, result))
                .collect(Collectors.toList());
                
            // Handle recovery notification
            if (newAlerts.isEmpty()) {
                return handleAlertRecover(rule);
            }
            
            return newAlerts;
        } catch (Exception e) {
            log.error("Calculate periodic rule {} failed: {}", rule.getName(), e.getMessage());
            return Collections.emptyList();
        }
    }

    private boolean execAlertExpression(Map<String, Object> result, String expr) {
        return false;
    }

    private SingleAlert buildAlert(AlertDefine rule, Map<String, Object> metrics) {
        return SingleAlert.builder()
                .labels(rule.getLabels())
                .annotations(rule.getAnnotations())
                .triggerTimes(1)
                .startAt(System.currentTimeMillis())
                .activeAt(System.currentTimeMillis())
                .build();
    }
    
    private List<SingleAlert> handleAlertRecover(AlertDefine rule) {
        SingleAlert firingAlert = notRecoveredAlertMap.remove(rule.getId().toString());
        if (firingAlert != null) {
            return Collections.singletonList(buildResolvedAlert(rule, firingAlert));
        }
        return Collections.emptyList();
    }

    private SingleAlert buildResolvedAlert(AlertDefine rule, SingleAlert firingAlert) {
        return null;
    }
} 
