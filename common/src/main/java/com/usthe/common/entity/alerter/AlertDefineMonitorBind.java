package com.usthe.common.entity.alerter;

import com.usthe.common.entity.manager.Monitor;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import javax.persistence.*;
import java.time.LocalDateTime;

import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_ONLY;
import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_WRITE;

/**
 * 告警定义与监控关联实体
 * @author tom
 * @date 2021/12/8 20:41
 */
@Entity
@Table(name = "alert_define_monitor_bind")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "告警定义与监控关联实体")
@EntityListeners(AuditingEntityListener.class)
public class AlertDefineMonitorBind {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @ApiModelProperty(value = "告警定义与监控关联主键索引ID", example = "74384", accessMode = READ_ONLY, position = 0)
    private Long id;

    @ApiModelProperty(value = "告警定义ID", example = "87432674384", accessMode = READ_WRITE, position = 1)
    private Long alertDefineId;

    @ApiModelProperty(value = "监控ID", example = "87432674336", accessMode = READ_WRITE, position = 2)
    @Column(name = "monitor_id")
    private Long monitorId;

    @ApiModelProperty(value = "记录创建时间(毫秒时间戳)", example = "1612198922000", accessMode = READ_ONLY, position = 4)
    @CreatedDate
    private LocalDateTime gmtCreate;

    @ApiModelProperty(value = "记录最新修改时间(毫秒时间戳)", example = "1612198444000", accessMode = READ_ONLY, position = 5)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "monitor_id", referencedColumnName = "id", foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT),
            insertable = false, updatable = false)
    @NotFound(action = NotFoundAction.IGNORE)
    private Monitor monitor;
}
