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
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.Objects;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;

/**
 * Tag Entity
 * @author tomsun28
 */
@Entity
@Table(name = "hzb_tag")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Tag Entity | 标签实体")
@EntityListeners(AuditingEntityListener.class)
public class Tag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Tag主键索引ID", example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "Tag Field | 标签名称", example = "app", accessMode = READ_WRITE)
    @NotNull
    private String name;

    @Schema(title = "Tag Value | 标签值", example = "23", accessMode = READ_WRITE)
    @Column(name = "`value`", length = 2048)
    private String value;

    @Schema(title = "Tag Color | 标签颜色", example = "#ffff", accessMode = READ_WRITE)
    private String color;

    @Schema(title = "Tag Color | 标签描述", example = "用于监控mysql", accessMode = READ_WRITE)
    private String description;

    @Schema(title = "标记类型 0:监控自动生成(monitorId,monitorName) 1: 用户生成 2: 系统预置", accessMode = READ_WRITE)
    @Min(0)
    @Max(3)
    private byte type;

    @Schema(title = "The creator of this record", example = "tom", accessMode = READ_ONLY)
    @CreatedBy
    private String creator;

    @Schema(title = "The modifier of this record", example = "tom", accessMode = READ_ONLY)
    @LastModifiedBy
    private String modifier;

    @Schema(title = "Record create time", example = "1612198922000", accessMode = READ_ONLY)
    @CreatedDate
    private LocalDateTime gmtCreate;

    @Schema(title = "Record modify time", example = "1612198444000", accessMode = READ_ONLY)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        Tag tag = (Tag) o;
        return Objects.equals(name, tag.name) && Objects.equals(value, tag.value);
    }

    @Override
    public int hashCode() {
        int hash = 7;
        hash = 13 * hash + (name == null ? 0 : name.hashCode()) + (value == null ? 0 : value.hashCode());
        return hash;
    }
}
