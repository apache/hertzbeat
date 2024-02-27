package org.dromara.hertzbeat.common.entity.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.dromara.hertzbeat.common.entity.manager.Collector;

/**
 * collector summary
 * @author tom
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "collector summary")
public class CollectorSummary {
    
    @Schema(description = "the collector info")
    private Collector collector;
    
    @Schema(description = "the number of monitors pinned in this collector")
    private int pinMonitorNum;
    
    @Schema(description = "the number of monitors dispatched in this collector")
    private int dispatchMonitorNum;
}
