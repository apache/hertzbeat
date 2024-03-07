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

package org.dromara.hertzbeat.common.entity.manager;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.Length;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;


/**
 * Monitor parameter values
 * 监控参数值
 * @author tomsun28
 */
@Entity
@Table(name = "hzb_param", indexes = { @Index(columnList = "monitorId") },
        uniqueConstraints = @UniqueConstraint(columnNames = {"monitorId", "field"}))
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Parameter Entity | 参数实体")
@EntityListeners(AuditingEntityListener.class)
public class Param {

    /**
     * Parameter primary key index ID
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "参数主键索引ID", example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    /**
     * Monitor ID
     * 监控任务ID
     */
    @Schema(title = "监控任务ID", example = "875846754543", accessMode = READ_WRITE)
    private Long monitorId;

    /**
     * Parameter Field Identifier
     * 参数字段标识符
     */
    @Schema(title = "参数标识符字段", example = "port", accessMode = READ_WRITE)
    @Length(max = 100)
    @NotNull
    private String field;

    /**
     * Param Value
     * 参数值
     */
    @Schema(title = "参数值", example = "8080", accessMode = READ_WRITE)
    @Length(max = 8126)
    @Column(name = "`value`", length = 8126)
    private String value;

    /**
     * Parameter type 0: number 1: string 2: encrypted string 3: json string mapped by map
     * 参数类型 0:数字 1:字符串 2:加密串 3:map映射的json串
     */
    @Schema(title = "参数类型 0:数字 1:字符串 2:加密串 3:map映射的json串 4:arrays string", accessMode = READ_WRITE)
    @Min(0)
    private byte type;

    /**
     * Record create time
     */
    @Schema(title = "Record create time", example = "1612198922000", accessMode = READ_ONLY)
    @CreatedDate
    private LocalDateTime gmtCreate;

    /**
     * Record the latest modification time
     */
    @Schema(title = "Record modify time", example = "1612198444000", accessMode = READ_ONLY)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;

}
