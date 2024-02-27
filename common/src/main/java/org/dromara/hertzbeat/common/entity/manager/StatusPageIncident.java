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
import java.util.List;
import java.util.Set;

/**
 * status page incident entity
 * @author tom
 */
@Entity
@Table(name = "hzb_status_page_incident")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "status page incident entity")
@EntityListeners(AuditingEntityListener.class)
public class StatusPageIncident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "ID", example = "87584674384")
    private Long id;
    
    @Schema(title = "org id", example = "1234")
    private Long orgId;

    @Schema(title = "incident name", example = "Gateway")
    @NotBlank
    private String name;
    
    @Schema(title = "incident current state: 0-Investigating 1-Identified 2-Monitoring 3-Resolved", example = "0")
    private byte state;

    @Schema(title = "incident start Investigating timestamp", example = "4248574985744")
    private Long startTime;

    @Schema(title = "incident end Resolved timestamp", example = "4248574985744")
    private Long endTime;

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
    
    @Schema(title = "status page components")
    @ManyToMany(targetEntity = StatusPageComponent.class, cascade = CascadeType.MERGE, fetch = FetchType.EAGER)
    @JoinTable(name = "hzb_status_page_incident_component_bind",
            foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT),
            inverseForeignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT),
            joinColumns = {@JoinColumn(name = "incident_id", referencedColumnName = "id")},
            inverseJoinColumns = {@JoinColumn(name = "component_id", referencedColumnName = "id")})
    private List<StatusPageComponent> components;
    
    @Schema(title = "status page incident content")
    @OneToMany(targetEntity = StatusPageIncidentContent.class, cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JoinColumn(name = "incident_id", referencedColumnName = "id")
    private Set<StatusPageIncidentContent> contents;
}
