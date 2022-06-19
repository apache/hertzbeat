package com.usthe.common.entity.manager;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import javax.persistence.*;
import java.time.LocalDateTime;

import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_ONLY;
import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_WRITE;

/**
 * Tag Bind Monitor
 * 标签与监控关联实体
 *
 *
 */
@Entity
@Table(name = "tag_monitor_bind")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "Tag Bind Monitor | 标签与监控关联实体")
@EntityListeners(AuditingEntityListener.class)
public class TagMonitorBind {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @ApiModelProperty(value = "主键索引ID", example = "87584674384", accessMode = READ_ONLY, position = 0)
    private Long id;

    @ApiModelProperty(value = "TAG ID", example = "87432674384", accessMode = READ_WRITE, position = 1)
    @Column(name = "tag_id")
    private Long tagId;

    @ApiModelProperty(value = "监控ID", example = "87432674336", accessMode = READ_WRITE, position = 2)
    @Column(name = "monitor_id")
    private Long monitorId;

    @ApiModelProperty(value = "记录创建时间(毫秒时间戳)", example = "1612198922000", accessMode = READ_ONLY, position = 3)
    @CreatedDate
    private LocalDateTime gmtCreate;

    @ApiModelProperty(value = "记录最新修改时间(毫秒时间戳)", example = "1612198444000", accessMode = READ_ONLY, position = 4)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;

}
