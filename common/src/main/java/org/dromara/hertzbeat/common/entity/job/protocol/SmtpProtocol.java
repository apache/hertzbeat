package org.dromara.hertzbeat.common.entity.job.protocol;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * @author dongfeng
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SmtpProtocol {
    /**
     * email主机ip或域名
     */
    private String host;

    /**
     * email主机端口
     */
    private String port;

    /**
     * 超时时间
     */
    private String timeout;

    /**
     * helo命令的测试者(email)
     */
    private String email;

    /**
     * 发送的命令
     */
    private String cmd;
}
