package org.dromara.hertzbeat.common.entity.job.protocol;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * rocketmq protocol
 * @author ceilzcx
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RocketmqProtocol {

    /**
     * rocketmq namesrv host
     */
    private String namesrvHost;

    /**
     * rocketmq namesrv port
     */
    private String namesrvPort;

    /**
     * accessKey
     */
    private String accessKey;

    /**
     * secretKey
     */
    private String secretKey;

    /**
     * jsonpath解析脚本
     */
    private String parseScript;
}
