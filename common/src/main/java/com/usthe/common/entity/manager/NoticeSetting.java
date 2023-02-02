package com.usthe.common.entity.manager;

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
import javax.validation.constraints.Max;
import javax.validation.constraints.Min;

import java.time.LocalDateTime;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;

/**
 * @author ceilzcx
 * @since 1/2/2023
 */
@Entity
@Table(name = "hzb_notice_setting")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "notice setting | 通知设置")
@EntityListeners(AuditingEntityListener.class)
public class NoticeSetting {

    /**
     * notice setting ID
     * 主键ID
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "通知设置ID", example = "87584674384", accessMode = READ_ONLY)
    private Long id;


    @Schema(title = "时间段设置类型", example = "0", accessMode = READ_WRITE)
    @Min(0)
    @Max(1)
    private Integer type;

    /**
     * set the valid start time
     * 设置有效的开始时间
     */
    @Schema(title = "开始时间(毫秒时间戳)", example = "1612198444000", accessMode = READ_WRITE)
    private LocalDateTime startTime;

    /**
     * set the valid end time
     * 设置有效的结束时间
     */
    @Schema(title = "结束时间(毫秒时间戳)", example = "1612198444000", accessMode = READ_WRITE)
    private LocalDateTime endTime;

    /**
     * set the valid start period time
     * 设置有效的起始限制时间
     */
    @Schema(title = "限制时间段起始", example = "00:00:00", accessMode = READ_WRITE)
    private String periodStart;

    /**
     * set the valid end period time
     * 设置有效的截止限制时间
     */
    @Schema(title = "限制时间段截止", example = "23:59:59", accessMode = READ_WRITE)
    private String periodEnd;

    /**
     * The creator of this record
     * 此条记录创建者
     */
    @Schema(title = "此条记录创建者", example = "tom", accessMode = READ_ONLY)
    @CreatedBy
    private String creator;

    /**
     * This record was last modified by
     * 此条记录最新修改者
     */
    @Schema(title = "此条记录最新修改者", example = "tom", accessMode = READ_ONLY)
    @LastModifiedBy
    private String modifier;

    /**
     * record creation time (millisecond timestamp)
     * 记录创建时间
     */
    @Schema(title = "记录创建时间(毫秒时间戳)", example = "1612198922000", accessMode = READ_ONLY)
    @CreatedDate
    private LocalDateTime gmtCreate;

    /**
     * Record the latest modification time (timestamp in milliseconds)
     * 记录最新修改时间
     */
    @Schema(title = "记录最新修改时间(毫秒时间戳)", example = "1612198444000", accessMode = READ_ONLY)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;
}
