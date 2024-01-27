package org.dromara.hertzbeat.model;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import javax.persistence.Entity;
import javax.persistence.EntityListeners;
import javax.persistence.Id;
import javax.persistence.Table;

@Entity
@Table(name = "grafana_service_account")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Grafana service account entity | Grafana 服务账号实体")
@EntityListeners(AuditingEntityListener.class)
public class ServiceAccount {
    @Id
    @Schema(description = "Service account id | 服务账号id")
    private String id;
    @Schema(description = "Service account name | 服务账号名称")
    private String name;
    @Schema(description = "Service account role | 服务账号角色")
    private String role;
    @Schema(description = "Service account is disabled | 服务账号是否禁用")
    private Boolean isDisabled;
    @Schema(description = "Service account token | 服务账号token")
    private String token;
}
