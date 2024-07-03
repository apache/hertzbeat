package org.apache.hertzbeat.manager.pojo.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Data;
import org.apache.hertzbeat.common.entity.manager.Monitor;

/**
 * Bulletin
 */
@Data
@Schema(description = "Bulletin")
public class Bulletin {

    @Schema(description = "Monitor Content")
    private Monitor monitor;

    @Schema(description = "Monitor Status")
    private int Status;

    @Schema(description = "Monitor Metrics")
    private List<String> metrics;

}
