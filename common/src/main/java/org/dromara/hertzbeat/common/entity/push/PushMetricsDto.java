package org.dromara.hertzbeat.common.entity.push;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * push metrics dto
 *
 * @author vinci
 */
@Data
@Builder
@AllArgsConstructor
public class PushMetricsDto {

    List<Metrics> metricsList;

    public PushMetricsDto() {
        metricsList = new ArrayList<>();
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Metrics {
        private long monitorId;
        private Long time;
        private List<Map<String, String>> metrics;
    }
}
