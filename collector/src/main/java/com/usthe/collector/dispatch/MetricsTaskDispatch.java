package com.usthe.collector.dispatch;

import com.usthe.collector.dispatch.timer.Timeout;

/**
 * Metric group collection task scheduler interface
 * 指标组采集任务调度器接口
 *
 *
 *
 */
public interface MetricsTaskDispatch {

    /**
     * schedule     调度
     *
     * @param timeout timeout
     */
    void dispatchMetricsTask(Timeout timeout);
}
