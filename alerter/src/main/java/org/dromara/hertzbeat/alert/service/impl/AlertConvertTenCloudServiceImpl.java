package org.dromara.hertzbeat.alert.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.dromara.hertzbeat.alert.dto.TenCloudAlertReport;
import org.dromara.hertzbeat.alert.service.AlertConvertService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class AlertConvertTenCloudServiceImpl implements AlertConvertService<TenCloudAlertReport> {
    @Autowired
    private ObjectMapper objectMapper;
    @Override
    public TenCloudAlertReport convert(String json) {
        TenCloudAlertReport tenCloudAlertReport = null;
        try {
            tenCloudAlertReport = objectMapper.readValue(json, TenCloudAlertReport.class);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }
        System.out.println(tenCloudAlertReport);
        return tenCloudAlertReport;
    }
}
