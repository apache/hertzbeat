package com.usthe.alert.calculate;

import com.googlecode.aviator.AviatorEvaluator;
import com.googlecode.aviator.Expression;
import com.usthe.alert.AlerterProperties;
import com.usthe.alert.AlerterWorkerPool;
import com.usthe.alert.AlerterDataQueue;
import com.usthe.alert.entrance.KafkaDataConsume;
import com.usthe.alert.pojo.entity.Alert;
import com.usthe.alert.pojo.entity.AlertDefine;
import com.usthe.alert.service.AlertDefineService;
import com.usthe.alert.util.AlertTemplateUtil;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import com.usthe.common.util.CommonUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 根据告警定义规则和采集数据匹配计算告警
 * @author tom
 * @date 2021/12/9 14:19
 */
@Configuration
@AutoConfigureAfter(value = {KafkaDataConsume.class})
@Slf4j
public class CalculateAlarm {

    private AlerterWorkerPool workerPool;
    private AlerterDataQueue dataQueue;
    private AlertDefineService alertDefineService;

    public CalculateAlarm (AlerterProperties properties, AlerterWorkerPool workerPool,
                           AlerterDataQueue dataQueue, AlertDefineService alertDefineService) {
        this.workerPool = workerPool;
        this.dataQueue = dataQueue;
        this.alertDefineService = alertDefineService;
        startCalculate();
    }

    private void startCalculate() {
        Runnable runnable = () -> {
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    CollectRep.MetricsData metricsData = dataQueue.pollMetricsData();
                    if (metricsData != null) {
                        calculate(metricsData);
                    }
                } catch (InterruptedException e) {
                    log.error(e.getMessage());
                }
            }
        };
        workerPool.executeJob(runnable);
        workerPool.executeJob(runnable);
        workerPool.executeJob(runnable);
    }

    private void calculate(CollectRep.MetricsData metricsData) {
        long monitorId = metricsData.getId();
        String app = metricsData.getApp();
        String metrics = metricsData.getMetrics();
        // 先判断采集响应数据状态 UN_REACHABLE/UN_CONNECTABLE 则需发最高级别告警
        if (metricsData.getCode() != CollectRep.Code.SUCCESS) {
            // 采集异常
            if (metricsData.getCode() == CollectRep.Code.UN_REACHABLE
                    || metricsData.getCode() == CollectRep.Code.UN_CONNECTABLE) {
                // 连接型可用性异常 UN_REACHABLE 对端不可达(网络层icmp) UN_CONNECTABLE 对端连接失败(传输层tcp,udp)
                Alert alert = Alert.builder()
                        .monitorId(monitorId)
                        .priority((byte) 0)
                        .status((byte) 0)
                        .target(CommonConstants.AVAILABLE)
                        .duration(300)
                        .content("监控紧急可用性告警: " + metricsData.getCode().name())
                        .build();
                dataQueue.addAlertData(alert);
            }
            return;
        }
        // 查出此监控类型下的此指标集合下关联配置的告警定义信息
        // field - define[]
        Map<String, List<AlertDefine>> defineMap = alertDefineService.getAlertDefines(monitorId, app, metrics);
        if (defineMap == null || defineMap.isEmpty()) {
            return;
        }
        List<CollectRep.Field> fields = metricsData.getFieldsList();
        Map<String, Object> fieldValueMap = new HashMap<>(16);
        fieldValueMap.put("app", app);
        fieldValueMap.put("metric", metrics);
        for (CollectRep.ValueRow valueRow : metricsData.getValuesList()) {
            if (!valueRow.getColumnsList().isEmpty()) {
                String instance = valueRow.getInstance();
                if (!"".equals(instance)) {
                    fieldValueMap.put("instance", instance);
                } else {
                    fieldValueMap.remove("instance");
                }
                for (int index = 0; index < valueRow.getColumnsList().size(); index++) {
                    String valueStr = valueRow.getColumns(index);
                    CollectRep.Field field = fields.get(index);
                    if (field.getType() == CommonConstants.TYPE_NUMBER) {
                        Double doubleValue = CommonUtil.parseDoubleStr(valueStr);
                        if (doubleValue != null) {
                            fieldValueMap.put(field.getName(), doubleValue);
                        } else {
                            fieldValueMap.remove(field.getName());
                        }
                    } else {
                        if (!"".equals(valueStr)) {
                            fieldValueMap.put(field.getName(), valueStr);
                        } else {
                            fieldValueMap.remove(field.getName());
                        }
                    }
                }
                for (Map.Entry<String, List<AlertDefine>> entry : defineMap.entrySet()) {
                    List<AlertDefine> defines = entry.getValue();
                    for (AlertDefine define : defines) {
                        String expr = define.getExpr();
                        try {
                            Expression expression = AviatorEvaluator.compile(expr, true);
                            Boolean match = (Boolean) expression.execute(fieldValueMap);
                            if (match) {
                                // 阈值规则匹配，触发告警 todo 告警延迟delay参数实现
                                Alert alert = Alert.builder()
                                        .monitorId(monitorId)
                                        .priority(define.getPriority())
                                        .status((byte) 0)
                                        .target(app + "." + metrics + "." + define.getField())
                                        .duration(define.getDuration())
                                        // 模板中关键字匹配替换
                                        .content(AlertTemplateUtil.render(define.getTemplate(), fieldValueMap))
                                        .build();
                                dataQueue.addAlertData(alert);
                                // 此优先级以下的阈值规则则忽略
                                break;
                            }
                        } catch (Exception e) {
                            log.warn(e.getMessage());
                        }
                    }
                }

            }
        }
    }
}
