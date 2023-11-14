package org.dromara.hertzbeat.alert.dto;

import lombok.*;
import org.apache.commons.lang3.StringUtils;
import org.dromara.hertzbeat.alert.util.DateUtil;
import org.dromara.hertzbeat.common.entity.dto.AlertReport;

/**
 * 通用云端告警实体类
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class GeneralCloudAlertReport extends AlertReport {

    /**
     * 告警日期时间
     */
    private String alertDateTime;

    /**
     * 日期时间格式
     */
    private String dateTimeFormat;

    /**
     * 可通过增强属性刷新告警时间的时间戳
     */
    public void refreshAlertTime() {
        // 有时间戳，取时间戳
        if (getAlertTime() != 0L) {
            return;
        }
        // 没有时间戳，判断是否有字符串配置
        if (StringUtils.isNotBlank(alertDateTime)) {
            Long timeStamp = null;
            // 优先用户配置
            if (StringUtils.isNotBlank(dateTimeFormat)) {
                timeStamp = DateUtil.getTimeStampFromFormat(alertDateTime, dateTimeFormat);
            }
            // 默认支持日期格式
            if (timeStamp == null) {
                timeStamp = DateUtil.getTimeStampFromSomeFormats(alertDateTime);
            }
            // 解析成功
            if (timeStamp != null) {
                setAlertTime(timeStamp);
                return;
            }
        }
        throw new RuntimeException("告警时间解析异常");
    }

}
