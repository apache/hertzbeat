/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.service;

import java.net.URI;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigOptions;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigPublicOptions;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigRequest;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigResponse;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreDTO;
import org.springframework.stereotype.Component;

/** Validates, merges, and redacts object-store configuration. */
@Component
public class ObjectStoreConfigMapper {

    private static final Set<String> SECRETS = Set.of("accessKey", "secretKey");

    public ObjectStoreDTO<ObjectStoreDTO.ObsConfig> toConfig(
            ObjectStoreConfigRequest request, ObjectStoreDTO<ObjectStoreDTO.ObsConfig> existing) {
        if (request == null || request.isUnknownFieldPresent() || request.getType() == null) {
            throw new IllegalArgumentException("Invalid object store config");
        }
        ObjectStoreDTO.Type type;
        try {
            type = ObjectStoreDTO.Type.valueOf(requireText(request.getType()).toUpperCase(Locale.ROOT));
        } catch (RuntimeException exception) {
            throw new IllegalArgumentException("Invalid object store type");
        }
        ObjectStoreConfigOptions options = request.getConfig();
        if (options != null && options.isUnknownFieldPresent()) {
            throw new IllegalArgumentException("Invalid object store config");
        }
        validateClears(request.getClearSecrets());
        if (type != ObjectStoreDTO.Type.OBS) {
            if (hasAnyOption(options)
                    || (request.getClearSecrets() != null && !request.getClearSecrets().isEmpty())) {
                throw new IllegalArgumentException("OBS state is only supported for OBS");
            }
            return new ObjectStoreDTO<>(type, null);
        }
        if (options == null) {
            throw new IllegalArgumentException("OBS options are required");
        }
        rejectAmbiguousSecret("accessKey", options.getAccessKey(), request.getClearSecrets());
        rejectAmbiguousSecret("secretKey", options.getSecretKey(), request.getClearSecrets());
        ObjectStoreDTO.ObsConfig previous =
                existing != null && existing.getType() == ObjectStoreDTO.Type.OBS ? existing.getConfig() : null;
        ObjectStoreDTO.ObsConfig target = new ObjectStoreDTO.ObsConfig();
        target.setAccessKey(secret("accessKey", options.getAccessKey(),
                previous == null ? null : previous.getAccessKey(), request.getClearSecrets()));
        target.setSecretKey(secret("secretKey", options.getSecretKey(),
                previous == null ? null : previous.getSecretKey(), request.getClearSecrets()));
        target.setBucketName(requireText(options.getBucketName()));
        target.setEndpoint(validateObsEndpoint(options.getEndpoint()));
        target.setSavePath(StringUtils.defaultIfBlank(options.getSavePath(), "hertzbeat").trim());
        requireText(target.getAccessKey());
        requireText(target.getSecretKey());
        return new ObjectStoreDTO<>(ObjectStoreDTO.Type.OBS, target);
    }

    public ObjectStoreConfigResponse toResponse(ObjectStoreDTO<ObjectStoreDTO.ObsConfig> config) {
        if (config.getType() != ObjectStoreDTO.Type.OBS) {
            return new ObjectStoreConfigResponse(config.getType(), null, Set.of());
        }
        ObjectStoreDTO.ObsConfig options = config.getConfig();
        if (options == null) {
            throw new IllegalArgumentException("OBS options are missing");
        }
        Set<String> configured = new LinkedHashSet<>();
        addConfigured(configured, "accessKey", options.getAccessKey());
        addConfigured(configured, "secretKey", options.getSecretKey());
        return new ObjectStoreConfigResponse(config.getType(),
                new ObjectStoreConfigPublicOptions(options.getBucketName(), options.getEndpoint(), options.getSavePath()),
                configured);
    }

    public String validateObsEndpoint(String endpoint) {
        try {
            URI uri = URI.create(requireText(endpoint));
            String host = uri.getHost();
            String path = uri.getPath();
            if (!"https".equalsIgnoreCase(uri.getScheme())
                    || host == null || !host.toLowerCase(Locale.ROOT).endsWith(".myhuaweicloud.com")
                    || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null
                    || !(StringUtils.isEmpty(path) || "/".equals(path))) {
                throw new IllegalArgumentException("Unsupported OBS endpoint");
            }
            return uri.toString();
        } catch (RuntimeException exception) {
            throw new IllegalArgumentException("Invalid OBS endpoint");
        }
    }

    private String secret(String name, String supplied, String existing, Set<String> clears) {
        if (clears != null && clears.contains(name)) {
            return null;
        }
        return StringUtils.isBlank(supplied) ? existing : supplied.trim();
    }

    private void validateClears(Set<String> clears) {
        if (clears != null && !SECRETS.containsAll(clears)) {
            throw new IllegalArgumentException("Unsupported secret clear");
        }
    }

    private void rejectAmbiguousSecret(String name, String supplied, Set<String> clears) {
        if (StringUtils.isNotBlank(supplied) && clears != null && clears.contains(name)) {
            throw new IllegalArgumentException("Ambiguous object store secret update");
        }
    }

    private boolean hasAnyOption(ObjectStoreConfigOptions options) {
        return options != null && (StringUtils.isNotBlank(options.getAccessKey())
                || StringUtils.isNotBlank(options.getSecretKey())
                || StringUtils.isNotBlank(options.getBucketName())
                || StringUtils.isNotBlank(options.getEndpoint())
                || StringUtils.isNotBlank(options.getSavePath()));
    }

    private String requireText(String value) {
        if (StringUtils.isBlank(value)) {
            throw new IllegalArgumentException("Required object store field is missing");
        }
        return value.trim();
    }

    private void addConfigured(Set<String> configured, String name, String value) {
        if (StringUtils.isNotBlank(value)) {
            configured.add(name);
        }
    }
}
