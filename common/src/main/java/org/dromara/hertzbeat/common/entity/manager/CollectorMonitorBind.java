package org.dromara.hertzbeat.common.entity.manager;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EntityListeners;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Table;
import java.time.LocalDateTime;

/**
 * collector entity
 *
 * @author tom
 */
@Entity
@Table(name = "hzb_collector_monitor_bind", indexes = {
        @Index(name = "index_collector_monitor", columnList = "collector"),
        @Index(name = "index_collector_monitor", columnList = "monitor_id")
})
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "slave collector monitor bind entity | 采集器与监控关联实体")
@EntityListeners(AuditingEntityListener.class)
public class CollectorMonitorBind {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "primary id", example = "23")
    private Long id;

    @Schema(title = "collector name", example = "87432674384")
    private String collector;

    @Schema(title = "monitor ID", example = "87432674336")
    @Column(name = "monitor_id")
    private Long monitorId;

    @Schema(title = "The creator of this record", example = "tom")
    @CreatedBy
    private String creator;

    @Schema(title = "This record was last modified by")
    @LastModifiedBy
    private String modifier;

    @Schema(title = "This record creation time (millisecond timestamp)")
    @CreatedDate
    private LocalDateTime gmtCreate;

    @Schema(title = "Record the latest modification time (timestamp in milliseconds)")
    @LastModifiedDate
    private LocalDateTime gmtUpdate;
}
