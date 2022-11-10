package com.usthe.collector.collect.k8s;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;


/**
 * K8sMetricsModel  k8s指标模型，node/namespace/pod三种类型指标通用
 * @author myth
 * @date 2022/10/08 15:31
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class K8sMetricsModel {
    //todo 定义不合理
    /**
     * k8s对象个数
     * */
    Integer number;
    /**
     * 指标名集合
     * */
    List<String> metricsList;
    /**
     * 指标值
     * */
    Map<String, List<String>> metricsMap;
}
