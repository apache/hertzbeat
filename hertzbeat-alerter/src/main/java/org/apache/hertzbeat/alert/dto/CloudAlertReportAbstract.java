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

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.Map;
import org.apache.hertzbeat.common.entity.dto.AlertReport;

/**
 * Abstract parent of cloud service alarm information
 * {@link AlertReport} - The method corresponds to the parameter of this class one by one. For details about the method, see this class
 */
public abstract class CloudAlertReportAbstract {

    /**
     * This parameter specifies the alarm name when a cloud alarm is converted to an internal alarm
     */
    @JsonIgnore
    public abstract String getAlertName();

    /**
     * Interval when a cloud alarm is converted to an internal alarm
     */
    @JsonIgnore
    public abstract Integer getAlertDuration();

    /**
     * Specifies the alarm time when a cloud alarm is converted to an internal alarm
     */
    @JsonIgnore
    public abstract long getAlertTime();

    /**
     * Severity of an alarm when a cloud alarm is converted to an internal alarm
     */
    @JsonIgnore
    public abstract Integer getPriority();

    /**
     * This parameter specifies the alarm type when a cloud alarm is converted to an internal alarm
     */
    @JsonIgnore
    public abstract Integer getReportType();

    /**
     * Alarm label information about a cloud alarm that is converted to an internal alarm
     */
    @JsonIgnore
    public abstract Map<String, String> getLabels();

    /**
     * Alarm labels when a cloud alarm is converted to an internal alarm
     */
    @JsonIgnore
    public abstract Map<String, String> getAnnotations();

    /**
     * This topic describes the alarm content when a cloud alarm is converted to an internal alarm
     */
    @JsonIgnore
    public abstract String getContent();

}
