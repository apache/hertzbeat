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

package org.apache.hertzbeat.alert.enums;

import java.util.Arrays;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.apache.hertzbeat.alert.dto.CloudAlertReportAbstract;
import org.apache.hertzbeat.alert.dto.TenCloudAlertReport;

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
