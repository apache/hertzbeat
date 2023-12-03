package org.dromara.hertzbeat.alert.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.dromara.hertzbeat.alert.dto.CloudAlertReportAbstract;
import org.dromara.hertzbeat.alert.dto.TenCloudAlertReport;

import java.util.Arrays;

/**
 * Cloud server alarm enum
 */
@AllArgsConstructor
@Getter
public enum CloudServiceAlarmInformationEnum {

    TencentCloud("tencloud", TenCloudAlertReport.class);

    /**
     * cloud service name
     */
    private final String cloudServiceName;

    /**
     * cloud service body
     */
    private final Class<? extends CloudAlertReportAbstract> cloudServiceAlarmInformationEntity;

    public static CloudServiceAlarmInformationEnum getEnumFromCloudServiceName(String name) {
        return Arrays.stream(CloudServiceAlarmInformationEnum.values())
                .filter(cloudService -> cloudService.cloudServiceName.equals(name))
                .findFirst()
                .orElse(null);
    }

}
