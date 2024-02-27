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
 * status page component entity
 * @author tom
 */
@Entity
@Table(name = "hzb_status_page_component")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "status page component entity")
@EntityListeners(AuditingEntityListener.class)
public class StatusPageComponent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "ID", example = "87584674384")
    private Long id;
    
    @Schema(title = "org id", example = "1234")
    private Long orgId;

    @Schema(title = "component name", example = "Gateway")
    @NotBlank
    private String name;

    @Schema(title = "component desc", example = "TanCloud Gateway")
    private String description;
    
    @Schema(title = "component match single tag", example = "{labelName:labelValue}")
    @Convert(converter = JsonTagAttributeConverter.class)
    private TagItem tag;

    @Schema(title = "calculate status method: 0-auto 1-manual", example = "0")
    private byte method;

    @Schema(title = "config state when use manual method: 0-Normal 1-Abnormal 2-unknown", example = "0")
    private byte configState;
    
    @Schema(title = "component current state: 0-Normal 1-Abnormal 2-unknown", example = "0")
    private byte state;

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
