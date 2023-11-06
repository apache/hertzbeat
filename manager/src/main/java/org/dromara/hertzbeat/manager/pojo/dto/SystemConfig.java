package org.dromara.hertzbeat.manager.pojo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 系统配置
 *
 * @author ceilzcx
 * @since 4/7/2023
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemConfig {

    /**
     * system time zone
     * 系统时区
     */
    private String timeZoneId;

    /**
     * system locale language region
     * 系统语言地区
     */
    private String locale;

    /**
     * layout ui theme
     */
    private String theme;
}
