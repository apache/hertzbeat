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

package org.apache.hertzbeat.ai.gateway.tool.entity;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.text.GatewaySecretRedactor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionRequest;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.apache.hertzbeat.manager.service.ObserveEntityService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

/** Bounded definition workflow; the central approval ledger binds the complete immutable apply arguments. */
@Service
public class AgentEntityDefinitionToolService {
    private final ObserveEntityService entities;

    public AgentEntityDefinitionToolService(ObserveEntityService entities) {
        this.entities = entities;
    }

    @Tool(name = "entity.definition_preview", description = "Parse and validate a YAML or JSON entity definition bundle without writing; returns sanitized objects and"
            + " payload SHA-256. For updates supply entityId. Maximum 50 entities and 128 KiB. Secret-bearing integration/extension configuration requires the entity UI.")
    @AgentToolPolicy(access = AgentToolAccess.USER, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> preview(String content, String format, @ToolParam(required = false) Long entityId) {
        EntityDefinitionRequest request = request(content, format);
        List<EntityDto> parsed = parse(request, entityId);
        return Map.of("payloadSha256", digest(content, format, entityId), "count", parsed.size(),
                "entities", parsed.stream().map(AgentEntityDefinitionToolService::safe).toList(),
                "mode", entityId == null ? "create" : "update",
                "warning", "Definition updates replace catalog fields, identities, monitor bindings and relations; review all affected objects before approval.");
    }

    @Tool(name = "entity.definition_apply", description = "Apply a previously previewed validated YAML/JSON definition. Require the preview payload SHA-256; the"
            + " approval ledger separately confirms these exact arguments. Updates replace identities, bindings and relations. Unsupported secret-bearing configuration must use the UI.")
    @AgentToolPolicy(access = AgentToolAccess.USER, risk = AgentToolRisk.CHANGE, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> apply(String content, String format, @ToolParam(required = false) Long entityId, String payloadSha256) {
        EntityDefinitionRequest request = request(content, format);
        if (!digest(content, format, entityId).equals(payloadSha256)) {
            throw new IllegalArgumentException("Definition payload does not match preview SHA-256");
        }
        requireNonSecret(parse(request, entityId));
        if (entityId != null) {
            entities.modifyEntityByDefinition(entityId, request);
            return Map.of("entityIds", List.of(entityId), "updated", true);
        }
        return Map.of("entityIds", entities.addEntitiesByDefinitionBundle(request), "created", true);
    }

    @Tool(name = "entity.definition_export", description = "Read an authorized YAML/JSON entity definition as a sanitized DTO projection, not a round-trip export. Use"
            + " the entity UI for original-format export; redacted output must not be reapplied.")
    @AgentToolPolicy(access = AgentToolAccess.STANDARD, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> export(long entityId, String format) {
        if (entityId <= 0 || !("yaml".equals(format) || "json".equals(format))) {
            throw new IllegalArgumentException("Positive entityId and yaml/json format are required");
        }
        String definition = entities.getEntityDefinition(entityId, format);
        if (definition == null) {
            throw new IllegalArgumentException("Entity not found");
        }
        // Redact the structured document rather than relying on string-pattern redaction of YAML keys.
        EntityDefinitionRequest request = request(definition, format);
        List<EntityDto> parsed = parse(request, entityId);
        return Map.of("entityId", entityId, "format", "sanitized-entity-dto", "entities", parsed.stream()
                .map(AgentEntityDefinitionToolService::safe).toList(), "reapplySafe", false);
    }

    private List<EntityDto> parse(EntityDefinitionRequest request, Long entityId) {
        if (entityId != null && entityId <= 0) {
            throw new IllegalArgumentException("entityId must be positive");
        }
        List<EntityDto> parsed = entityId == null ? entities.parseEntityDefinitionBundle(request)
                : List.of(entities.parseEntityDefinition(request, entityId));
        if (parsed.isEmpty() || parsed.size() > 50) {
            throw new IllegalArgumentException("Definition must contain between 1 and 50 entities");
        }
        for (EntityDto dto : parsed) {
            if (dto.getEntityInfo().getIntegrations() != null || dto.getEntityInfo().getExtensions() != null
                    || dto.getEntityInfo().getHertzbeat() != null) {
                throw new IllegalArgumentException("Integration, extension and HertzBeat configuration definitions require the entity UI");
            }
            entities.validate(dto, entityId != null);
        }
        return parsed;
    }

    void validateTemplate(String content, String format) {
        requireNonSecret(parse(request(content, format), null));
    }

    @SuppressWarnings("unchecked")
    private static void requireNonSecret(List<EntityDto> values) {
        for (EntityDto dto : values) {
            Map<String, Object> original = JsonUtil.fromJson(JsonUtil.toJson(dto), Map.class);
            if (original == null || !original.equals(GatewaySecretRedactor.redactMap(original))) {
                throw new IllegalArgumentException("Secret-bearing definitions require the entity UI");
            }
        }
    }

    private static EntityDefinitionRequest request(String content, String format) {
        if (content == null || content.isBlank() || content.length() > 131072
                || !("yaml".equals(format) || "json".equals(format))) {
            throw new IllegalArgumentException("Provide a nonempty YAML or JSON definition no larger than 128 KiB");
        }
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setContent(content);
        request.setFormat(format);
        return request;
    }

    private static String digest(String content, String format, Long entityId) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest((format + "\n" + entityId + "\n" + content).getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 unavailable", exception);
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> safe(EntityDto dto) {
        Map<String, Object> values = JsonUtil.fromJson(JsonUtil.toJson(dto), Map.class);
        return GatewaySecretRedactor.redactMap(values);
    }
}
