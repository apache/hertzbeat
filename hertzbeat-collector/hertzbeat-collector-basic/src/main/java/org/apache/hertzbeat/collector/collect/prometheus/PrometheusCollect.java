package org.apache.hertzbeat.collector.collect.prometheus;

import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;

import java.util.List;

public interface PrometheusCollect {

    /**
     * Collect prometheus metrics data
     * @param builder metrics data builder
     * @param metrics metrics config
     * @return list of metrics data
     */
    List<CollectRep.MetricsData> collect(CollectRep.MetricsData.Builder builder, Metrics metrics);

    /**
     * Get the protocol name this collector supported
     * @return protocol name
     */
    String supportProtocol();
}
