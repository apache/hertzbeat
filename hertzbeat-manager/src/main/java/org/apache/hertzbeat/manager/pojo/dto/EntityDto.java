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

package org.apache.hertzbeat.manager.pojo.dto;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.EntityRelation;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;

/**
 * Entity interaction DTO.
 */
@Schema(description = "Entity DTO")
public class EntityDto {

    @NotNull
    @Valid
    private EntityInfo entityInfo;

    @Valid
    private List<EntityIdentity> identities;

    @Valid
    private List<EntityMonitorBind> monitorBinds;

    @Valid
    private List<EntityRelation> relations;

    @Schema(description = "entity content", accessMode = READ_WRITE)
    @JsonProperty("entity")
    public EntityInfo getEntityInfo() {
        return entityInfo;
    }

    @JsonProperty("entity")
    public void setEntityInfo(EntityInfo entityInfo) {
        this.entityInfo = entityInfo;
    }

    @JsonIgnore
    public ObserveEntity getEntity() {
        return entityInfo == null ? null : entityInfo.toEntity();
    }

    public void setEntity(ObserveEntity entity) {
        this.entityInfo = EntityInfo.fromEntity(entity);
    }

    @Schema(description = "entity identities", accessMode = READ_WRITE)
    public List<EntityIdentity> getIdentities() {
        return identities;
    }

    public void setIdentities(List<EntityIdentity> identities) {
        this.identities = identities;
    }

    @Schema(description = "monitor bindings", accessMode = READ_WRITE)
    public List<EntityMonitorBind> getMonitorBinds() {
        return monitorBinds;
    }

    public void setMonitorBinds(List<EntityMonitorBind> monitorBinds) {
        this.monitorBinds = monitorBinds;
    }

    @Schema(description = "entity relations", accessMode = READ_ONLY)
    public List<EntityRelation> getRelations() {
        return relations;
    }

    public void setRelations(List<EntityRelation> relations) {
        this.relations = relations;
    }
}
