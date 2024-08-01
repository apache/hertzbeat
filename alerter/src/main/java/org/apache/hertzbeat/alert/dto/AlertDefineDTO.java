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
import cn.afterturn.easypoi.excel.annotation.ExcelTarget;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import lombok.Data;
import org.apache.hertzbeat.common.entity.manager.TagItem;

/**
 * Data transfer object for alert configuration
 */

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
@ExcelTarget(value = "AlertDefineDTO")
public class AlertDefineDTO {
    @Excel(name = "App")
    private String app;
    @Excel(name = "Metric")
    private String metric;
    @Excel(name = "Field")
    private String field;
    @Excel(name = "Preset")
    private Boolean preset;
    @Excel(name = "Expr")
    private String expr;
    @Excel(name = "Priority")
    private Byte priority;
    @Excel(name = "Times")
    private Integer times;
    @Excel(name = "Tags")
    private List<TagItem> tags;
    @Excel(name = "Enable")
    private Boolean enable;
    @Excel(name = "RecoverNotice")
    private Boolean recoverNotice;
    @Excel(name = "Template")
    private String template;
}
