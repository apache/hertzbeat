package org.apache.hertzbeat.collector.constants;

import lombok.Getter;
import org.apache.hertzbeat.common.entity.collector.CollectorMetaData;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.timer.Timeout;

public enum ContextKey {
    META_DATA(CollectorMetaData.class),
    JOB(Job.class),
    TIMEOUT(Timeout.class),
    METRICS_COLLECT_START_TIME(Long.class),
    METRICS(Metrics.class),
    METRICS_KEY(String.class),
    ;

    @Getter
    private final Class<?> clazz;

    ContextKey(Class<?> clazz) {
        this.clazz = clazz;
    }
}