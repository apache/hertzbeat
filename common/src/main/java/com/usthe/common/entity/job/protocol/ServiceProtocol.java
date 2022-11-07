package com.usthe.common.entity.job.protocol;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


/**
 * msa 微服务指标协议公共配置信息
 *
 *
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ServiceProtocol {
    /**
     * 当前环境下，k8sAPI服务器对应的host
     */
    private String k8sHost;
    /**
     * 当前环境下，k8sAPI服务器的端口Port
     */
    private String k8sAPIServPort;
    /**
     * 连接k8sAPI服务器需要的token
     */
    private String k8sAPIToken;
    /**
     * 筛选微服务所在pod的关键字
     * 根据podName里面是否包含该关键字作为筛选依据，有就选
     */
    private String podFilter;
    /**
     * 通过jsonPath筛选出元数据
     */
    private String metaData;
    /**
     * 微服务协议内置http协议 用于子指标使用
     */
    private HttpProtocol http;

}
