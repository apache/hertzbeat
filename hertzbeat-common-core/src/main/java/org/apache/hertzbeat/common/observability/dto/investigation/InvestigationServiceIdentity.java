/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.common.observability.dto.investigation;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Trusted workspace and canonical service identity observed on persisted telemetry. */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record InvestigationServiceIdentity(String workspaceId,
                                           String entityId,
                                           String entityType,
                                           String serviceName,
                                           String serviceNamespace,
                                           String deploymentEnvironment) {

    public InvestigationServiceIdentity {
        workspaceId = required(workspaceId, 128, "workspaceId");
        entityId = required(entityId, 20, "entityId");
        try {
            if (Long.parseLong(entityId) <= 0L) {
                throw new IllegalArgumentException("entityId must be positive");
            }
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("entityId must be a positive long", exception);
        }
        entityType = required(entityType, 64, "entityType");
        serviceName = required(serviceName, 256, "serviceName");
        serviceNamespace = optional(serviceNamespace, 256, "serviceNamespace");
        deploymentEnvironment = optional(deploymentEnvironment, 128, "deploymentEnvironment");
    }

    private static String required(String value, int maxLength, String label) {
        String normalized = optional(value, maxLength, label);
        if (normalized == null) {
            throw new IllegalArgumentException(label + " is required");
        }
        return normalized;
    }

    private static String optional(String value, int maxLength, String label) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.length() > maxLength || normalized.codePoints().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException(label + " is invalid");
        }
        return normalized;
    }
}
