package com.usthe.common.model;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.util.HashMap;
import java.util.Map;


/**
 * msa 微服务指标模型
 * @author myth
 * @date 2022/7/15 15:20
 */
@Setter
@Getter
@ToString
public class ServicePodModel {

    /**
     * pod名称
     */
    private String podName;

    /**
     * pod host地址
     */
    private String podHost;

    /**
     * pod 端口
     */
    private String podPort;

    /**
     * pod 状态
     */
    private String status;

    /**
     * 指标采集时间
     */
    private String timestamp;

    /**
     * 采集的指标信息
     * key: 指标名称 或者 指标唯一标识
     * value: 采集到指标的具体信息
     */
    private Map<String, Object> metricsMap = new HashMap<>();
}
