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
import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.Objects;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.constants.PluginType;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Plugin Entity
 */
@Entity
@Table(name = "hzb_plugin_item")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "PluginItem Entity")
@EntityListeners(AuditingEntityListener.class)
public class PluginItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Plugin Primary key index ID", example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "metadata_id")
    @JsonIgnore
    private PluginMetadata pluginMetadata;

    @Schema(title = "Plugin implementation class full path", example = "org.apache.hertzbeat.plugin.impl.DemoPluginImpl", accessMode = READ_WRITE)
    private String classIdentifier;

    @Schema(title = "Plugin type", example = "POST_ALERT", accessMode = READ_WRITE)
    @Enumerated(EnumType.STRING)
    private PluginType type;

    public PluginItem(String classIdentifier, PluginType type) {
        this.classIdentifier = classIdentifier;
        this.type = type;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        PluginItem that = (PluginItem) o;
        return Objects.equals(id, that.id) && Objects.equals(classIdentifier, that.classIdentifier) && type == that.type;
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, classIdentifier, type);
    }
}
