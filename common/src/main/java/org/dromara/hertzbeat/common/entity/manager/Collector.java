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

import javax.persistence.Entity;
import javax.persistence.EntityListeners;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;
import javax.persistence.UniqueConstraint;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotNull;
import java.time.LocalDateTime;

/**
 * collector entity
 *
 * @author tom
 */
@Entity
@Table(name = "hzb_collector", uniqueConstraints = @UniqueConstraint(columnNames = {"name"}))
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "slave collector entity | 注册采集器实体")
@EntityListeners(AuditingEntityListener.class)
public class Collector {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "primary id", example = "2")
    private Long id;

    @Schema(title = "collector identity name", description = "collector identity name")
    @NotNull
    private String name;

    @Schema(title = "collector ip", description = "collector remote ip")
    @NotNull
    private String ip;

    @Schema(title = "collector status: 0-online 1-offline")
    @Min(0)
    private byte status;

    @Schema(title = "collector mode: public or private")
    private String mode;

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
