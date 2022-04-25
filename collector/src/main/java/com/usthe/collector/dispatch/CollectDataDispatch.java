package com.usthe.collector.dispatch;


import com.usthe.collector.dispatch.timer.Timeout;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.message.CollectRep;

/**
 * Collection data scheduler interface
 * 采集数据调度器接口
 *
 * @author tomsun28
 * @date 2021/11/2 11:20
 */
public interface CollectDataDispatch {

    /**
     * Processing and distributing collection result data
     * 处理分发采集结果数据
     *
     * @param timeout     time wheel timeout        时间轮timeout
     * @param metrics     The following indicator group collection tasks    下面的指标组采集任务
     * @param metricsData Collect result data       采集结果数据
     */
    void dispatchCollectData(Timeout timeout, Metrics metrics, CollectRep.MetricsData metricsData);

}
