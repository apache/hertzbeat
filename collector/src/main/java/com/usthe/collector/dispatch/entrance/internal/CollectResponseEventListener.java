package com.usthe.collector.dispatch.entrance.internal;

import com.usthe.common.entity.message.CollectRep;

import java.util.EventListener;
import java.util.List;

/**
 * 一次性采集任务响应结果监听器
 * @author tomsun28
 * @date 2021/11/16 10:09
 */
public interface CollectResponseEventListener extends EventListener {

    /**
     * 采集任务完成结果通知
     * @param responseMetrics 响应数据
     */
    default void response(List<CollectRep.MetricsData> responseMetrics) {}
}
