package org.apache.hertzbeat.common.entity.grafana;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.io.Serializable;

/**
 * Grafana config
 * Grafana 配置
 */
@Data
@Schema(description = "Grafana config | Grafana 配置")
public class Grafana implements Serializable {
    private static final long serialVersionUID = 1L;
    @Schema(title = "is enabled | 是否启用")
    private boolean enabled;
    @Schema(title = "template | 模板")
    private String template;
}
