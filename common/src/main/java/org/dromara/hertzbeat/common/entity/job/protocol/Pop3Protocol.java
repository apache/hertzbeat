package org.dromara.hertzbeat.common.entity.job.protocol;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.commons.lang3.StringUtils;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class Pop3Protocol {
    /**
     * 接收服务器地址
     */
    private String host;

    /**
     * 接收服务器端口
     */
    private String port;

    /**
     * 超时时间
     */
    private String timeout;

    /**
     * 是否开启SSL加密【邮箱传输】
     */
    private String ssl = "false";

    /**
     * pop邮箱地址
     */
    private String email;

    /**
     * 授权码
     */
    private String authorize;

    public boolean isInvalid() {
        return StringUtils.isAllBlank(host, port, timeout, ssl, email, authorize);
    }
}
