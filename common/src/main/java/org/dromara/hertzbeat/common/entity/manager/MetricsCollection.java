package org.dromara.hertzbeat.common.entity.manager;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.Length;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import javax.persistence.*;
import javax.validation.constraints.NotNull;
import java.time.LocalDateTime;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;

@Entity
@Table(name = "hzb_metrics_collection")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "MetricsCollection Entity | 指标收藏实体")
@EntityListeners(AuditingEntityListener.class)
public class MetricsCollection {

    /**
     * Parameter primary key index ID
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "参数主键索引ID", example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    /**
     * Monitor ID
     * 监控任务ID
     */
    @Schema(title = "监控任务ID", example = "875846754543", accessMode = READ_WRITE)
    private Long monitorId;

    /**
     * Metric Name
     * 指标名称
     */
    @Schema(title = "指标名称", example = "rabbitmq_channel_messages_unconfirmed", accessMode = READ_WRITE)
    @Length(max = 100)
    @NotNull
    private String metric;

    /**
     * Record create time
     */
    @Schema(title = "Record create time", example = "1612198922000", accessMode = READ_ONLY)
    @CreatedDate
    private LocalDateTime gmtCreate;

    /**
     * Record the latest modification time
     */
    @Schema(title = "Record modify time", example = "1612198444000", accessMode = READ_ONLY)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;
}
