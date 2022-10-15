/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.usthe.common.entity.alerter;

import com.usthe.common.entity.manager.Monitor;
import io.swagger.v3.oas.annotations.media.Schema;
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

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;


/**
 * 告警定义与监控关联实体
 * @author tom
 * @date 2021/12/8 20:41
 */
@Entity
@Table(name = "hzb_alert_define_monitor_bind")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "告警定义与监控关联实体")
@EntityListeners(AuditingEntityListener.class)
public class AlertDefineMonitorBind {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "告警定义与监控关联主键索引ID", example = "74384", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "告警定义ID", example = "87432674384", accessMode = READ_WRITE)
    private Long alertDefineId;

    @Schema(title = "监控ID", example = "87432674336", accessMode = READ_WRITE)
    @Column(name = "monitor_id")
    private Long monitorId;

    @Schema(title = "记录创建时间(毫秒时间戳)", example = "1612198922000", accessMode = READ_ONLY)
    @CreatedDate
    private LocalDateTime gmtCreate;

    @Schema(title = "记录最新修改时间(毫秒时间戳)", example = "1612198444000", accessMode = READ_ONLY)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "monitor_id", referencedColumnName = "id", foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT),
            insertable = false, updatable = false)
    @NotFound(action = NotFoundAction.IGNORE)
    private Monitor monitor;
}
