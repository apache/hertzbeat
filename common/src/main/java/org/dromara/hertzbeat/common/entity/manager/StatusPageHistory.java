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

import javax.persistence.*;
import java.time.LocalDateTime;

/**
 * status page history entity
 * @author tom
 */
@Entity
@Table(name = "hzb_status_page_history")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "status page component history entity")
@EntityListeners(AuditingEntityListener.class)
public class StatusPageHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "ID", example = "87584674384")
    private Long id;

    @Schema(title = "component id", example = "1234")
    private Long componentId;

    @Schema(title = "component state: 0-Normal 1-Abnormal 2-unknown", example = "0")
    private byte state;

    @Schema(title = "state calculate timestamp", example = "4248574985744")
    private Long timestamp;
    
    @Schema(title = "state uptime percentage", example = "99.99")
    private Double uptime;
    
    @Schema(title = "state abnormal time(s)", example = "1000")
    private Integer abnormal;

    @Schema(title = "state unknown time(s)", example = "1000")
    @Column(name = "`unknown`")
    private Integer unknown;

    @Schema(title = "state normal tim(s)", example = "1000")
    private Integer normal;

    @Schema(title = "The creator of this record", example = "tom")
    @CreatedBy
    private String creator;

    @Schema(title = "The modifier of this record", example = "tom")
    @LastModifiedBy
    private String modifier;

    @Schema(title = "Record create time", example = "1612198922000")
    @CreatedDate
    private LocalDateTime gmtCreate;

    @Schema(title = "Record modify time", example = "1612198444000")
    @LastModifiedDate
    private LocalDateTime gmtUpdate;
}
