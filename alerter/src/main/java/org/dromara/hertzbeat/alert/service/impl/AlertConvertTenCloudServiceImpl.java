package org.dromara.hertzbeat.alert.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.dromara.hertzbeat.alert.dto.TenCloudAlertReport;
import org.dromara.hertzbeat.alert.service.AlertConvertService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class AlertConvertTenCloudServiceImpl implements AlertConvertService {
    @Autowired
    private ObjectMapper objectMapper;
    @Override
    public Object convert(String json) {
        TenCloudAlertReport tenCloudAlertReport = objectMapper.convertValue(json, TenCloudAlertReport.class);
        System.out.println(tenCloudAlertReport);
        return tenCloudAlertReport;
    }
}
