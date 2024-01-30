package org.dromara.hertzbeat.common.entity.grafana;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;
import java.io.Serializable;

@Entity
@Table(name = "grafana_dashboard")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Grafana dashboard entity | Grafana 仪表盘实体")
public class Dashboard implements Serializable {
    @Id
    @Schema(description = "Dashboard id | 仪表盘id")
    private Long id;
    @Schema(description = "Dashboard folderUid | 仪表盘文件夹id")
    private String folderUid;
    @Schema(description = "Dashboard slug | 仪表盘slug")
    private String slug;
    @Schema(description = "Dashboard status | 仪表盘状态")
    private String status;
    @Schema(description = "Dashboard uid | 仪表盘uid")
    private String uid;
    @Schema(description = "Dashboard url | 仪表盘url")
    private String url;
    @Schema(description = "Dashboard version | 仪表盘版本")
    private Long version;
    @Schema(description = "Monitor id | 监控任务id")
    private Long monitorId;
}
