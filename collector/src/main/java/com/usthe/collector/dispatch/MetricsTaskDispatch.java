package com.usthe.collector.dispatch;

import com.usthe.collector.dispatch.timer.Timeout;

/**
 * 指标组采集任务调度器接口
 * @author tomsun28
 * @date 2021/11/2 11:19
 */
public interface MetricsTaskDispatch {

    /**
     * 调度
     * @param timeout timeout
     */
    void dispatchMetricsTask(Timeout timeout);
}
