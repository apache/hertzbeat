package com.usthe.warehouse.store;

import com.usthe.common.entity.dto.Value;
import com.usthe.common.entity.message.CollectRep;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.DisposableBean;

import java.util.List;
import java.util.Map;

/**
 * data storage abstract class
 * @author ceilzcx
 * @since 2022/10/12
 */
@Slf4j
public abstract class AbstractHistoryDataStorage implements DisposableBean {
    protected boolean serverAvailable;

    /**
     * @return data storage是否可用
     */
    public boolean isServerAvailable() {
        return serverAvailable;
    }

    /**
     * 持久化数据
     * @param metricsData 采集数据
     */
    abstract void saveData(CollectRep.MetricsData metricsData);

    /**
     * 从时序数据库获取指标历史数据
     *
     * @param monitorId 监控ID
     * @param app 监控类型
     * @param metrics 指标集合名
     * @param metric 指标名
     * @param instance 实例
     * @param history 历史范围
     * @return 指标历史数据列表
     */
    public abstract Map<String, List<Value>> getHistoryMetricData(
            Long monitorId, String app, String metrics, String metric, String instance, String history);

    /**
     * 从时序数据库获取指标历史间隔数据 平均值 最大值 最小值
     * @param monitorId 监控ID
     * @param app 监控类型
     * @param metrics 指标集合名
     * @param metric 指标名
     * @param instance 实例
     * @param history 历史范围
     * @return 指标历史数据列表
     */
    public abstract Map<String, List<Value>> getHistoryIntervalMetricData(
            Long monitorId, String app, String metrics, String metric, String instance, String history);
}
