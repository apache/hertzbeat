package org.dromara.hertzbeat.manager.pojo.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.dromara.hertzbeat.common.entity.manager.StatusPageComponent;
import org.dromara.hertzbeat.common.entity.manager.StatusPageHistory;

import java.util.List;

/**
 * status page's component status dto
 * @author tom
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Status Page's Component Status")
public class ComponentStatus { 
    
    @Schema(description = "Component Info")
    private StatusPageComponent info;
    
    @Schema(description = "Component History")
    private List<StatusPageHistory> history;
}
