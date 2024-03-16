package org.dromara.hertzbeat.common.entity.grafana;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


/**
 * Grafana service account entity
 * Grafana 服务账号实体
 */
@Entity
@Table(name = "grafana_service_account")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Grafana service account entity | Grafana 服务账号实体")
public class ServiceAccount {
    @Id
    @Schema(description = "Service account id | 服务账号id")
    private Long id;
    @Schema(description = "Service account name | 服务账号名称")
    private String name;
    @Schema(description = "Service account role | 服务账号角色")
    private String role;
    @Schema(description = "Service account is disabled | 服务账号是否禁用")
    private Boolean isDisabled;
    @Schema(description = "Service account tokens | 服务账号tokens")
    private Integer tokens;
    @Schema(description = "Service account avatar url | 服务账号头像url")
    private String avatarUrl;
    @Schema(description = "Service account login | 服务账号登录名")
    private String login;
    @Schema(description = "Service account orgId | 服务账号组织Id")
    private Integer orgId;

}
