package org.apache.hertzbeat.collector.constants;

import lombok.Getter;

/**
 * Schedule Type
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
