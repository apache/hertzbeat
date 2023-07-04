package org.dromara.hertzbeat.manager.pojo.dto;

import lombok.Data;

/**
 * 系统配置
 *
 * @author ceilzcx
 * @since 4/7/2023
 */
@Data
public class SystemConfig {

    /**
     * 系统时区
     */
    private String timeZoneId;

    /**
     * 系统语言
     */
    private String language;
}
