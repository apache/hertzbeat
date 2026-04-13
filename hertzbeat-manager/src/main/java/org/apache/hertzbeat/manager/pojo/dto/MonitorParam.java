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

package org.apache.hertzbeat.manager.pojo.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.manager.Param;

/**
 * Manager-side monitor param DTO detached from JPA annotations.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class MonitorParam {

    private Long id;

    private Long monitorId;

    @Size(max = 100)
    @NotBlank(message = "field can not null")
    private String field;

    @Size(max = 8126)
    private String paramValue;

    @Min(0)
    private byte type;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtUpdate;

    public static MonitorParam fromEntity(Param param) {
        if (param == null) {
            return null;
        }
        MonitorParam monitorParam = new MonitorParam();
        monitorParam.setId(param.getId());
        monitorParam.setMonitorId(param.getMonitorId());
        monitorParam.setField(param.getField());
        monitorParam.setParamValue(param.getParamValue());
        monitorParam.setType(param.getType());
        monitorParam.setGmtCreate(param.getGmtCreate());
        monitorParam.setGmtUpdate(param.getGmtUpdate());
        return monitorParam;
    }

    public Param toEntity() {
        Param param = new Param();
        param.setId(id);
        param.setMonitorId(monitorId);
        param.setField(field);
        param.setParamValue(paramValue);
        param.setType(type);
        param.setGmtCreate(gmtCreate);
        param.setGmtUpdate(gmtUpdate);
        return param;
    }
}
