package org.dromara.hertzbeat.common.entity.job.protocol;

import org.apache.commons.lang3.StringUtils;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class NginxProtocol {
    /**
     * nginx主机ip或域名
     */
    private String host;

    /**
     * nginx主机端口
     */
    private String port;

    /**
     * 超时时间
     */
    private String timeout;

    /**
     * 监控模块页面url
     */
    private String url;

    /**
     * 校验相关参数
     * @return
     */
    public boolean isInValid() {
        return StringUtils.isAnyBlank(host, port, timeout);
    }
}
