package com.usthe.common.entity.job.protocol;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * k8s规范实现采集的配置信息
 * @author myth
 * @date 2022/7/20 15:31
 */

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class K8sProtocol {

    /**
     * k8s集群host
     */
    private String host;
    /**
     * k8s APIServer 端口
     */
    private String port;
    /**
     * k8s token
     */
    private String token;
    /**
     * k8s type，包括node、namespace、pod三类
     */
    private String type;
}
