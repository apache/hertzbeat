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

import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.manager.EntityCatalogContact;
import org.apache.hertzbeat.common.entity.manager.EntityCatalogLink;
import org.apache.hertzbeat.common.entity.manager.EntityOwnerRef;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import tools.jackson.databind.JsonNode;

/**
 * Manager-side entity DTO detached from JPA annotations.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class EntityInfo {

    private Long id;

    @Size(max = 32)
    private String type;

    @Size(max = 128)
    private String name;

    @Size(max = 128)
    private String displayName;

    @Size(max = 128)
    private String subtype;

    @Size(max = 128)
    private String namespace;

    @Size(max = 128)
    private String environment;

    @Size(max = 32)
    private String status;

    @Size(max = 32)
    private String criticality;

    @Size(max = 128)
    private String owner;

    private List<EntityOwnerRef> additionalOwners;

    @Size(max = 512)
    private String runbook;

    @Size(max = 64)
    private String lifecycle;

    @Size(max = 64)
    private String tier;

    @Size(max = 128)
    private String system;

    private List<String> componentOf;

    private List<String> components;

    private List<String> implementedBy;

    private JsonNode apiInterface;

    @Size(max = 255)
    private String inheritFrom;

    private List<String> languages;

    private List<EntityCatalogLink> links;

    private List<EntityCatalogContact> contacts;

    private JsonNode integrations;

    private JsonNode extensions;

    private JsonNode hertzbeat;

    @Size(max = 32)
    private String source;

    @Size(max = 512)
    private String description;

    private Map<String, String> labels;

    private List<String> tags;

    private String creator;

    private String modifier;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtUpdate;

    public static EntityInfo fromEntity(ObserveEntity entity) {
        if (entity == null) {
            return null;
        }
        EntityInfo info = new EntityInfo();
        info.setId(entity.getId());
        info.setType(normalizeCatalogType(entity));
        info.setName(entity.getName());
        info.setDisplayName(entity.getDisplayName());
        info.setSubtype(entity.getSubtype());
        info.setNamespace(entity.getNamespace());
        info.setEnvironment(entity.getEnvironment());
        info.setStatus(entity.getStatus());
        info.setCriticality(entity.getCriticality());
        info.setOwner(entity.getOwner());
        info.setAdditionalOwners(entity.getAdditionalOwners());
        info.setRunbook(entity.getRunbook());
        info.setLifecycle(entity.getLifecycle());
        info.setTier(entity.getTier());
        info.setSystem(entity.getSystem());
        info.setComponentOf(entity.getComponentOf());
        info.setComponents(entity.getComponents());
        info.setImplementedBy(entity.getImplementedBy());
        info.setApiInterface(entity.getApiInterface() == null ? null : entity.getApiInterface().deepCopy());
        info.setInheritFrom(entity.getInheritFrom());
        info.setLanguages(entity.getLanguages());
        info.setLinks(entity.getLinks());
        info.setContacts(entity.getContacts());
        info.setIntegrations(entity.getIntegrations() == null ? null : entity.getIntegrations().deepCopy());
        info.setExtensions(entity.getExtensions() == null ? null : entity.getExtensions().deepCopy());
        info.setHertzbeat(entity.getHertzbeat() == null ? null : entity.getHertzbeat().deepCopy());
        info.setSource(entity.getSource());
        info.setDescription(entity.getDescription());
        info.setLabels(entity.getLabels());
        info.setTags(entity.getTags());
        info.setCreator(entity.getCreator());
        info.setModifier(entity.getModifier());
        info.setGmtCreate(entity.getGmtCreate());
        info.setGmtUpdate(entity.getGmtUpdate());
        return info;
    }

    private static String normalizeCatalogType(ObserveEntity entity) {
        if (entity == null || !StringUtils.hasText(entity.getType())) {
            return entity == null ? null : entity.getType();
        }
        if (!"endpoint".equalsIgnoreCase(entity.getType())) {
            return entity.getType();
        }
        if (!CollectionUtils.isEmpty(entity.getImplementedBy())
                || entity.getApiInterface() != null
                || (StringUtils.hasText(entity.getSubtype()) && entity.getSubtype().toLowerCase().contains("api"))) {
            return "api";
        }
        return entity.getType();
    }

    public ObserveEntity toEntity() {
        ObserveEntity entity = new ObserveEntity();
        entity.setId(id);
        entity.setType(type);
        entity.setName(name);
        entity.setDisplayName(displayName);
        entity.setSubtype(subtype);
        entity.setNamespace(namespace);
        entity.setEnvironment(environment);
        entity.setStatus(status);
        entity.setCriticality(criticality);
        entity.setOwner(owner);
        entity.setAdditionalOwners(additionalOwners);
        entity.setRunbook(runbook);
        entity.setLifecycle(lifecycle);
        entity.setTier(tier);
        entity.setSystem(system);
        entity.setComponentOf(componentOf);
        entity.setComponents(components);
        entity.setImplementedBy(implementedBy);
        entity.setApiInterface(apiInterface == null ? null : apiInterface.deepCopy());
        entity.setInheritFrom(inheritFrom);
        entity.setLanguages(languages);
        entity.setLinks(links);
        entity.setContacts(contacts);
        entity.setIntegrations(integrations == null ? null : integrations.deepCopy());
        entity.setExtensions(extensions == null ? null : extensions.deepCopy());
        entity.setHertzbeat(hertzbeat == null ? null : hertzbeat.deepCopy());
        entity.setSource(source);
        entity.setDescription(description);
        entity.setLabels(labels);
        entity.setTags(tags);
        entity.setCreator(creator);
        entity.setModifier(modifier);
        entity.setGmtCreate(gmtCreate);
        entity.setGmtUpdate(gmtUpdate);
        return entity;
    }
}
