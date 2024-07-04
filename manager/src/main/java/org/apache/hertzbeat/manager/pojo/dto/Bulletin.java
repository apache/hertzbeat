package org.apache.hertzbeat.manager.pojo.dto;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.manager.JsonStringListAttributeConverter;
import org.apache.hertzbeat.common.entity.manager.JsonTagListAttributeConverter;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Tag;
import org.apache.hertzbeat.common.entity.manager.TagItem;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;

/**
 * Bulletin
 */
@Entity
@Data
@Schema(description = "Bulletin")
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "hzb_bulletin")
public class Bulletin {

    @Id
    @Schema(description = "Bulletin ID", example = "1")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Schema(description = "Monitor ID", example = "1")
    @Column(name = "monitor_id")
    private Long monitorId;

    @Schema(description = "Monitor Metrics", example = "[\"cpu\", \"memory\"]")
    @Convert(converter = JsonStringListAttributeConverter.class)
    private List<String> metrics;

    @Schema(description = "Tags(status:success,env:prod)", example = "{name: key1, value: value1}",
            accessMode = READ_WRITE)
    @Convert(converter = JsonTagListAttributeConverter.class)
    @Column(length = 2048)
    private List<TagItem> tags;

    @Schema(title = "The creator of this record", example = "tom", accessMode = READ_ONLY)
    @CreatedBy
    private String creator;

    @Schema(title = "The modifier of this record", example = "tom", accessMode = READ_ONLY)
    @LastModifiedBy
    private String modifier;

    @Schema(title = "Record create time", example = "2024-07-02T20:09:34.903217", accessMode = READ_ONLY)
    @CreatedDate
    private LocalDateTime gmtCreate;

    @Schema(title = "Record modify time", example = "2024-07-02T20:09:34.903217", accessMode = READ_ONLY)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;
}
