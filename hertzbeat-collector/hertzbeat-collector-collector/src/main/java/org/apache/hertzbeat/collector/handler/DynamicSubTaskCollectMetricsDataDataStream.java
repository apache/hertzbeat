package org.apache.hertzbeat.collector.handler;

import org.apache.hertzbeat.collector.context.Context;
import org.apache.hertzbeat.collector.handler.impl.AbstractBatchDataStream;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;

/**
 *
 */
public class DynamicSubTaskCollectMetricsDataDataStream extends AbstractBatchDataStream<Metrics, CollectRep.MetricsData.Builder> {
    @Override
    public CollectRep.MetricsData.Builder executeWithResponse(Context context, Metrics data) {
        //todo 动态拆分
        return null;
    }
}
