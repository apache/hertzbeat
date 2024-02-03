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
import javax.validation.constraints.NotBlank;
import java.time.LocalDateTime;

/**
 * status page incident entity content.
 * @author tom
 */
@Entity
@Table(name = "hzb_status_page_incident_content")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "status page incident content entity")
@EntityListeners(AuditingEntityListener.class)
public class StatusPageIncidentContent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "ID", example = "87584674384")
    private Long id;
    
    @Schema(title = "org id", example = "1234")
    @Column(name = "incident_id")
    private Long incidentId;

    @Schema(title = "incident content message", example = "we find the gateway connection timeout")
    @NotBlank
    private String message;
    
    @Schema(title = "incident state: 0-Investigating 1-Identified 2-Monitoring 3-Resolved", example = "0")
    private byte state;

    @Schema(title = "incident content message timestamp", example = "4248574985744")
    private Long timestamp;

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
