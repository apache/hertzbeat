package com.usthe.warehouse;

import com.usthe.common.entity.message.CollectRep;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

/**
 * 采集数据队列
 * @author tom
 * @date 2021/11/24 17:58
 */
@Component
@Slf4j
public class MetricsDataQueue {

    private final LinkedBlockingQueue<CollectRep.MetricsData> dataInfluxQueue;
    private final LinkedBlockingQueue<CollectRep.MetricsData> dataRedisQueue;

    public MetricsDataQueue() {
        dataInfluxQueue = new LinkedBlockingQueue<>();
        dataRedisQueue = new LinkedBlockingQueue<>();
    }

    public void addMetricsDataToInflux(CollectRep.MetricsData metricsData) {
        dataInfluxQueue.offer(metricsData);
    }

    public CollectRep.MetricsData pollInfluxMetricsData() throws InterruptedException {
        return dataInfluxQueue.poll(2, TimeUnit.SECONDS);
    }

    public void addMetricsDataToRedis(CollectRep.MetricsData metricsData) {
        dataRedisQueue.offer(metricsData);
    }

    public CollectRep.MetricsData pollRedisMetricsData() throws InterruptedException {
        return dataRedisQueue.poll(2, TimeUnit.SECONDS);
    }
}
