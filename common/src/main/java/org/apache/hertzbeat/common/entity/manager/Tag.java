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

package org.apache.hertzbeat.common.entity.manager;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.Objects;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Tag Entity
 */
@Entity
@Table(name = "hzb_tag")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Tag Entity")
@EntityListeners(AuditingEntityListener.class)
public class Tag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Tag Primary key index ID", example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "Tag Field", example = "app", accessMode = READ_WRITE)
    @NotBlank(message = "name can not null")
    private String name;

    @Schema(title = "Tag Value", example = "23", accessMode = READ_WRITE)
    @Column(length = 2048)
    private String tagValue;

    @Schema(title = "Tag Color", example = "#ffff", accessMode = READ_WRITE)
    private String color;

    @Schema(title = "Tag Color", example = "Used for monitoring mysql", accessMode = READ_WRITE)
    private String description;

    @Schema(title = "Tag type 0: Auto-generated monitor (monitorId,monitorName) 1: user-generated 2: system preset",
            accessMode = READ_WRITE)
    @Min(0)
    @Max(3)
    private Byte type;

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
        return Objects.equals(name, tag.name) && Objects.equals(tagValue, tag.tagValue);
    }

    @Override
    public int hashCode() {
        int hash = 7;
        hash = 13 * hash + (name == null ? 0 : name.hashCode()) + (tagValue == null ? 0 : tagValue.hashCode());
        return hash;
    }
}
