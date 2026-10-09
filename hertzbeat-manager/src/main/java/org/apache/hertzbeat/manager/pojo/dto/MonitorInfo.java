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

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.support.valid.HostValid;

/**
 * Manager-side monitor DTO detached from JPA annotations.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class MonitorInfo {

    private Long id;

    private Long jobId;

    @Size(max = 100)
    private String name;

    @Size(max = 100)
    private String app;

    @Size(max = 100)
    private String scrape;

    @Size(max = 100)
    @HostValid
    private String instance;

    @Min(10)
    private Integer intervals;

    @Size(max = 20)
    private String scheduleType;

    @Size(max = 100)
    private String cronExpression;

    @Min(0)
    @Max(4)
    private byte status;

    private byte type;

    private Map<String, String> labels;

    private Map<String, String> annotations;

    @Size(max = 255)
    private String description;

    private String creator;

    private String modifier;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtUpdate;

    public static MonitorInfo fromEntity(Monitor monitor) {
        if (monitor == null) {
            return null;
        }
        MonitorInfo info = new MonitorInfo();
        info.setId(monitor.getId());
        info.setJobId(monitor.getJobId());
        info.setName(monitor.getName());
        info.setApp(monitor.getApp());
        info.setScrape(monitor.getScrape());
        info.setInstance(monitor.getInstance());
        info.setIntervals(monitor.getIntervals());
        info.setScheduleType(monitor.getScheduleType());
        info.setCronExpression(monitor.getCronExpression());
        info.setStatus(monitor.getStatus());
        info.setType(monitor.getType());
        info.setLabels(monitor.getLabels());
        info.setAnnotations(monitor.getAnnotations());
        info.setDescription(monitor.getDescription());
        info.setCreator(monitor.getCreator());
        info.setModifier(monitor.getModifier());
        info.setGmtCreate(monitor.getGmtCreate());
        info.setGmtUpdate(monitor.getGmtUpdate());
        return info;
    }

    public Monitor toEntity() {
        Monitor monitor = new Monitor();
        monitor.setId(id);
        monitor.setJobId(jobId);
        monitor.setName(name);
        monitor.setApp(app);
        monitor.setScrape(scrape);
        monitor.setInstance(instance);
        monitor.setIntervals(intervals);
        monitor.setScheduleType(scheduleType);
        monitor.setCronExpression(cronExpression);
        monitor.setStatus(status);
        monitor.setType(type);
        monitor.setLabels(labels);
        monitor.setAnnotations(annotations);
        monitor.setDescription(description);
        monitor.setCreator(creator);
        monitor.setModifier(modifier);
        monitor.setGmtCreate(gmtCreate);
        monitor.setGmtUpdate(gmtUpdate);
        return monitor;
    }
}
