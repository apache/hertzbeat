package org.dromara.hertzbeat.common.util.prometheus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * prometheus metric line entity
 *
 *
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Metric {
    private String metricName;
    private List<Label> labelList;
    private Double value;
    private Long timestamp;
}
