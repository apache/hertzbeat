package org.apache.hertzbeat.collector.constants;

import lombok.Getter;

/**
 * @author AlbertYang
 * @date 2025/9/17 13:45
 */
@Getter
public enum ScheduleTypeEnum {

    INTERVAL("interval"),
    CRON("cron");

    private final String type;

    ScheduleTypeEnum(String type) {
        this.type = type;
    }



}
