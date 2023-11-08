package org.dromara.hertzbeat.alert.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.dromara.hertzbeat.alert.dto.CloudAlertReportAbstract;
import org.dromara.hertzbeat.alert.dto.TenCloudAlertReport;

import java.util.Arrays;

/**
 * 云服务告警枚举
 */
@AllArgsConstructor
@Getter
public enum CloudServiceAlarmInformationEnum {

    TencentCloud("tencloud", TenCloudAlertReport.class);

    /**
     * 云服务名称
     */
    private final String cloudServiceName;

    /**
     * 云服务对应的请求实体
     */
    private final Class<? extends CloudAlertReportAbstract> cloudServiceAlarmInformationEntity;

    public static CloudServiceAlarmInformationEnum getEnumFromCloudServiceName(String name) {
        return Arrays.stream(CloudServiceAlarmInformationEnum.values())
                .filter(cloudService -> cloudService.cloudServiceName.equals(name))
                .findFirst()
                .orElse(null);
    }

}
