package org.apache.hertzbeat.collector.handler;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.collect.strategy.CollectStrategyFactory;
import org.apache.hertzbeat.collector.constants.ContextKey;
import org.apache.hertzbeat.collector.constants.ContextStatus;
import org.apache.hertzbeat.collector.context.Context;
import org.apache.hertzbeat.collector.dispatch.CollectTaskTimeoutMonitor;
import org.apache.hertzbeat.collector.handler.impl.AbstractBatchDataBoundHandler;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.timer.Timeout;


@Data
@Slf4j
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class CollectMetricsDataHandler extends AbstractBatchDataBoundHandler<Metrics, CollectRep.MetricsData.Builder> {
    private CollectTaskTimeoutMonitor collectTaskTimeoutMonitor;

    @Override
    public CollectRep.MetricsData.Builder executeWithResponse(Context context, Metrics data) {
        // preset start info
        context.put(ContextKey.METRICS, data);
        Job job = context.get(ContextKey.JOB);
        long startTime = context.get(ContextKey.METRICS_COLLECT_START_TIME);
        setNewThreadName(job.getMonitorId(), job.getApp(), startTime, data);


        Timeout timeout = context.get(ContextKey.TIMEOUT);
        String key = data.getPrometheus() != null ? String.valueOf(job.getId()) : job.getId() + "-" + data.getName();
        context.put(ContextKey.METRICS_KEY, key);
        this.collectTaskTimeoutMonitor.putMetrics(key, new CollectTaskTimeoutMonitor.MetricsTime(startTime, data, timeout));


        CollectRep.MetricsData.Builder fetchedData = this.fetchData(job, data);
        if (fetchedData.getCode() != CollectRep.Code.SUCCESS && CommonConstants.AVAILABLE_METRICS == data.getPriority()) {
            context.setStatus(ContextStatus.TRUNCATE_HANDLER);
        }
        return fetchedData;
    }

    private void setNewThreadName(long monitorId, String app, long startTime, Metrics metrics) {
        String builder = monitorId + "-" + app + "-" + metrics.getName() + "-" + String.valueOf(startTime).substring(9);
        Thread.currentThread().setName(builder);
    }

    private CollectRep.MetricsData.Builder fetchData(Job job, Metrics metrics) {
        CollectRep.MetricsData.Builder response = CollectRep.MetricsData.newBuilder();
        response.setApp(job.getApp())
                .setId(job.getMonitorId())
                .setTenantId(job.getTenantId())
                .setLabels(job.getLabels())
                .setAnnotations(job.getAnnotations())
                .addMetadataAll(job.getMetadata());

        //todo transcribe Prometheus to different chain
        // for prometheus auto or proxy mode
//        if (DispatchConstants.PROTOCOL_PROMETHEUS.equalsIgnoreCase(metrics.getProtocol())) {
//            List<CollectRep.MetricsData> metricsData = PrometheusAutoCollectImpl.getInstance().collect(response, metrics);
//            validateResponse(metricsData == null ? null : metricsData.stream().findFirst().orElse(null));
//            collectDataDispatch.dispatchCollectData(timeout, metrics, metricsData);
//            return null;
//        }

        response.setMetrics(metrics.getName());
        // According to the metrics collection protocol, application type, etc.,
        // dispatch to the real application metrics collection implementation class
        AbstractCollect abstractCollect = CollectStrategyFactory.invoke(metrics.getProtocol());
        if (abstractCollect == null) {
            log.error("[Dispatcher] - not support this: app: {}, metrics: {}, protocol: {}.", job.getApp(), metrics.getName(), metrics.getProtocol());
            response.setCode(CollectRep.Code.FAIL);
            response.setMsg("not support " + job.getApp() + ", " + metrics.getName() + ", " + metrics.getProtocol());

            return response;
        }

        try {
            abstractCollect.preCheck(metrics);
            abstractCollect.collect(response, metrics);
        } catch (Exception e) {
            String msg = e.getMessage();
            if (msg == null && e.getCause() != null) {
                msg = e.getCause().getMessage();
            }
            if (e instanceof IllegalArgumentException) {
                log.error("[Metrics PreCheck]: {}.", msg, e);
            } else {
                log.error("[Metrics Collect]: {}.", msg, e);
            }
            response.setCode(CollectRep.Code.FAIL);
            if (msg != null) {
                response.setMsg(msg);
            }
        }

        return response;
    }
}
