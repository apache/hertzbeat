package org.apache.hertzbeat.common.entity.job;

import lombok.Data;

import java.util.List;

/**
 *
 */
@Data
public class MetricsSource {
    private List<Metrics> metricsList;
}
