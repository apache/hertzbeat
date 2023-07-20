package org.dromara.hertzbeat.alert.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.alert.dto.TenCloudAlertReport;
import org.dromara.hertzbeat.alert.service.AlertConvertService;
import org.dromara.hertzbeat.common.entity.dto.AlertReport;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.HashMap;

/**
 * @author zqr10159
 * 腾讯云告警转化类
 */
@Component
@Slf4j
public class AlertConvertTenCloudServiceImpl implements AlertConvertService<AlertReport> {
    @Autowired
    private ObjectMapper objectMapper;
    @Override
    public AlertReport convert(String json) {
        TenCloudAlertReport tenCloudAlertReport;
        AlertReport alert = null;
        try {
            tenCloudAlertReport = objectMapper.readValue(json, TenCloudAlertReport.class);
            StringBuilder contentBuilder = new StringBuilder();
            String content = contentBuilder.append("[").append("告警对象：地区")
                    .append(tenCloudAlertReport.getAlarmObjInfo().getRegion()).append("|")
                    .append(tenCloudAlertReport.getAlarmObjInfo().getNamespace()).append("]")
                    .append("[").append("告警内容：")
                    .append(tenCloudAlertReport.getAlarmPolicyInfo().getPolicyTypeCname()).append("|")
                    .append(tenCloudAlertReport.getAlarmPolicyInfo().getConditions().getMetricShowName()).append("|")
                    .append(tenCloudAlertReport.getAlarmPolicyInfo().getConditions().getMetricName())
                    .append(tenCloudAlertReport.getAlarmPolicyInfo().getConditions().getCalcType())
                    .append(tenCloudAlertReport.getAlarmPolicyInfo().getConditions().getCalcValue())
                    .append(tenCloudAlertReport.getAlarmPolicyInfo().getConditions().getCalcUnit()).append("]")
                    .append("[").append("当前数据")
                    .append(tenCloudAlertReport.getAlarmPolicyInfo().getConditions().getCurrentValue())
                    .append(tenCloudAlertReport.getAlarmPolicyInfo().getConditions().getCalcUnit()).append("]").toString();

            HashMap<String, String> tagMap = new HashMap<>(1);
            tagMap.put("app", "TenCloud");
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
            long occurTime = sdf.parse(tenCloudAlertReport.getFirstOccurTime()).getTime();
            alert = AlertReport.builder().content(content)
                    .alertName("TenCloud|腾讯云")
                    .alertTime(occurTime)
                    .alertDuration(tenCloudAlertReport.getDurationTime())
                    .priority(1)
                    .reportType(1)
                    .labels(tagMap)
                    .annotations(tagMap).build();

        } catch (JsonProcessingException|ParseException e) {
            log.error("解析腾讯云告警内容失败！");
        }
        return alert;
    }
}
