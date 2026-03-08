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
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Plugin Entity
 */
@Entity
@Table(name = "hzb_plugin_metadata")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Plugin Entity")
@EntityListeners(AuditingEntityListener.class)
public class PluginMetadata {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Plugin Primary key index ID", example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "plugin name", example = "notification plugin", accessMode = READ_WRITE)
    @NotNull
    private String name;

    @Schema(title = "Plugin activation status", example = "true", accessMode = READ_WRITE)
    private Boolean enableStatus;

    @Schema(title = "Jar file path", example = "true", accessMode = READ_WRITE)
    private String jarFilePath;

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        PluginMetadata that = (PluginMetadata) o;
        return Objects.equals(id, that.id) && Objects.equals(name, that.name) && Objects.equals(enableStatus, that.enableStatus) && Objects.equals(jarFilePath,
            that.jarFilePath) && Objects.equals(creator, that.creator) && Objects.equals(gmtCreate, that.gmtCreate);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, name, enableStatus, jarFilePath, creator, gmtCreate);
    }

    @Schema(title = "The creator of this record", example = "tom", accessMode = READ_ONLY)
    @CreatedBy
    private String creator;

    @Schema(title = "Record create time", example = "1612198922000", accessMode = READ_ONLY)
    @CreatedDate
    private LocalDateTime gmtCreate;

    @OneToMany(targetEntity = PluginItem.class, cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JoinColumn(name = "metadata_id", referencedColumnName = "id")
    private List<PluginItem> items;

    @Schema(title = "Param count", example = "1", accessMode = READ_WRITE)
    private Integer paramCount;


}
