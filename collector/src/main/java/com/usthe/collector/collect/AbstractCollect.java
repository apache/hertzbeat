package com.usthe.collector.collect;


import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.message.CollectRep;

/**
 * 具体的指标组采集实现抽象类
 * @author tomsun28
 * @date 2021/11/4 9:35
 */
public abstract class AbstractCollect {

    /**
     * 真正的采集实现接口
     * @param builder response builder
     * @param appId 应用监控ID
     * @param app 应用类型
     * @param metrics 指标组配置
     * return response builder
     */
    public abstract void collect(CollectRep.MetricsData.Builder builder, long appId, String app, Metrics metrics);
}
