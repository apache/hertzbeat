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

package org.apache.hertzbeat.alert.dto;

import lombok.*;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.alert.util.DateUtil;
import org.apache.hertzbeat.common.entity.dto.AlertReport;

/**
 * Generic cloud alarm entity class
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class GeneralCloudAlertReport extends AlertReport {

    /**
     * Alarm date and time
     */
    private String alertDateTime;

    /**
     * DATE TIME FORMAT
     */
    private String dateTimeFormat;

    /**
     * You can refresh the timestamp of the alarm time with enhanced properties
     */
    public void refreshAlertTime() {
        if (getAlertTime() != 0L) {
            return;
        }
        if (StringUtils.isNotBlank(alertDateTime)) {
            Long timeStamp = null;
            if (StringUtils.isNotBlank(dateTimeFormat)) {
                timeStamp = DateUtil.getTimeStampFromFormat(alertDateTime, dateTimeFormat);
            }
            if (timeStamp == null) {
                timeStamp = DateUtil.getTimeStampFromSomeFormats(alertDateTime);
            }
            if (timeStamp != null) {
                setAlertTime(timeStamp);
                return;
            }
        }
        throw new RuntimeException("parse alarm time error");
    }

}
