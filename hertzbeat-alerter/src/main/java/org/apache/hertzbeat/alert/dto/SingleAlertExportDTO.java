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

import cn.afterturn.easypoi.excel.annotation.Excel;
import lombok.Data;

/**
 * A SingleAlert with its Map and timestamp fields pre-rendered to strings, since easypoi cannot map those to cells.
 */
@Data
public class SingleAlertExportDTO {

    @Excel(name = "Status", width = 12)
    private String status;

    @Excel(name = "Content", width = 60)
    private String content;

    @Excel(name = "Labels", width = 40)
    private String labels;

    @Excel(name = "Annotations", width = 40)
    private String annotations;

    @Excel(name = "Fingerprint", width = 24)
    private String fingerprint;

    @Excel(name = "Trigger Times", width = 12)
    private Integer triggerTimes;

    @Excel(name = "Start At", width = 20)
    private String startAt;

    @Excel(name = "Active At", width = 20)
    private String activeAt;

    @Excel(name = "End At", width = 20)
    private String endAt;
}
