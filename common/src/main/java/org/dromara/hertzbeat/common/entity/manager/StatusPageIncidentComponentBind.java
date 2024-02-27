package org.dromara.hertzbeat.common.entity.manager;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import javax.persistence.*;

import java.time.LocalDateTime;

/**
 * status page incident component bind entity
 * @author tom
 */
@Entity
@Table(name = "hzb_status_page_incident_component_bind", indexes = {
        @Index(name = "index_incident_component", columnList = "incident_id"),
        @Index(name = "index_incident_component", columnList = "component_id")
})
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Incident Component Bind")
@EntityListeners(AuditingEntityListener.class)
public class StatusPageIncidentComponentBind {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Identity", example = "87584674384")
    private Long id;

    @Schema(title = "Incident ID", example = "87432674384")
    @Column(name = "incident_id")
    private Long incidentId;
    
    @Schema(title = "Component ID", example = "87432674336")
    @Column(name = "component_id")
    private Long componentId;

    @Schema(title = "Record create time", example = "1612198922000")
    @CreatedDate
    private LocalDateTime gmtCreate;

    @Schema(title = "Record modify time", example = "1612198444000")
    @LastModifiedDate
    private LocalDateTime gmtUpdate;
    
}
