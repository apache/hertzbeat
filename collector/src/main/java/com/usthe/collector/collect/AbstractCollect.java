package com.usthe.collector.collect;


import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.message.CollectRep;

/**
 * Specific indicator group collection implementation abstract class
 * 具体的指标组采集实现抽象类
 *
 * @author tomsun28
 * @date 2021/11/4 9:35
 */
public abstract class AbstractCollect {

    /**
     * Real acquisition implementation interface
     * 真正的采集实现接口
     *
     * @param builder response builder
     * @param appId   App monitoring ID   应用监控ID
     * @param app     Application Type  应用类型
     * @param metrics Metric group configuration    指标组配置
     *                return response builder
     */
    public abstract void collect(CollectRep.MetricsData.Builder builder, long appId, String app, Metrics metrics);
}
