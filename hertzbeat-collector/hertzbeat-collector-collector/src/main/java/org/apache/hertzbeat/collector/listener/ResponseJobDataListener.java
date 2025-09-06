package org.apache.hertzbeat.collector.listener;

import com.google.common.collect.Lists;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.constants.ContextKey;
import org.apache.hertzbeat.collector.context.Context;
import org.apache.hertzbeat.collector.handler.ContextBoundListener;
import org.apache.hertzbeat.collector.timer.TimerDispatch;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.message.CollectRep;

/**
 * 一次性任务专用
 */
@Slf4j
@AllArgsConstructor
public class ResponseJobDataListener implements ContextBoundListener<CollectRep.MetricsData.Builder> {
    private TimerDispatch timerDispatch;

    @Override
    public void execute(Context context, CollectRep.MetricsData.Builder data) {
        Job job = context.get(ContextKey.JOB);
        CollectRep.MetricsData metricsData = data.build();

        oneTimeJobDebugLog(metricsData);
        timerDispatch.responseSyncJobData(job.getId(), Lists.newArrayList(metricsData));
    }

    private void oneTimeJobDebugLog(CollectRep.MetricsData metricsData) {
        if (log.isDebugEnabled()) {
            log.debug("One-time Job: {}", metricsData.getMetrics());
            metricsDataDebugLog(metricsData);
        }
    }

    private void metricsDataDebugLog(CollectRep.MetricsData metricsData) {
        for (CollectRep.ValueRow valueRow : metricsData.getValues()) {
            for (CollectRep.Field field : metricsData.getFields()) {
                log.debug("Field-->{},Value-->{}", field.getName(), valueRow.getColumns(metricsData.getFields().indexOf(field)));
            }
        }
    }
}
