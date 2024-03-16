package org.dromara.hertzbeat.common.entity.grafana;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


/**
 * Grafana service token entity
 * Grafana 服务token实体
 */
@Entity
@Table(name = "grafana_service_token")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Grafana service token entity | Grafana 服务token实体")
public class ServiceToken {
    @Id
    @Schema(description = "Service token id | 服务token id")
    private Long id;
    @Schema(description = "Service token name | 服务token 名称")
    private String name;
    @Schema(description = "Service token key | 服务token key")
    @Column(name = "`key`")
    private String key;
}
