package org.dromara.hertzbeat.common.entity.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotNull;

/**
 * collector info
 * @author tom
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "collector info")
public class CollectorInfo {
    
    @NotNull
    private String name;
    
    @NotNull
    private String ip;
    
    // todo more
    
}
