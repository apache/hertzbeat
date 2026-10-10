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

package org.apache.hertzbeat.manager.service.impl;

import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.PUBLIC_BASE_URL;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.SERVER_OTLP_GRPC;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.SERVER_OTLP_HTTP;

import java.lang.reflect.Type;
import java.util.Map;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.constants.GeneralConfigTypeEnum;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.PublicAccessConfig;
import org.apache.hertzbeat.manager.pojo.dto.PublicAccessConfigRequest;
import org.apache.hertzbeat.manager.service.PublicAccessConfigService;
import org.apache.hertzbeat.manager.setup.config.ManagedActiveConfigurationInspector;
import org.apache.hertzbeat.manager.setup.config.SetupInstallationPaths;
import org.apache.hertzbeat.manager.setup.config.SetupPublicAddress;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;

/** Runtime configuration with a read-only fallback to values collected by setup. */
@Service
public class PublicAccessGeneralConfigServiceImpl extends AbstractGeneralConfigServiceImpl<PublicAccessConfig>
        implements PublicAccessConfigService {
    private final ManagedActiveConfigurationInspector inspector;
    private final Environment environment;

    public PublicAccessGeneralConfigServiceImpl(GeneralConfigDao generalConfigDao, Environment environment) {
        super(generalConfigDao);
        var root = SetupInstallationPaths.root(environment);
        inspector = new ManagedActiveConfigurationInspector(root);
        this.environment = environment;
    }

    @Override
    public PublicAccessConfig getConfig() {
        PublicAccessConfig stored = super.getConfig();
        if (stored != null) {
            return stored;
        }
        var inspection = inspector.inspect();
        return response(inspection.state() == ManagedActiveConfigurationInspector.State.LOADABLE
                ? inspection.applicationProperties() : Map.of());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PublicAccessConfig saveAndGetConfig(PublicAccessConfigRequest request) {
        if (request == null || request.isUnknownFieldPresent()) {
            throw new IllegalArgumentException("Invalid public access config");
        }
        PublicAccessConfig config = new PublicAccessConfig(
                SetupPublicAddress.publicBaseUrl(request.getPublicBaseUrl())
                        .map(SetupPublicAddress::value).orElse(null),
                SetupPublicAddress.serverOtlpEndpoint(request.getServerOtlpHttpEndpoint())
                        .map(SetupPublicAddress::value).orElse(null),
                SetupPublicAddress.serverOtlpEndpoint(request.getServerOtlpGrpcEndpoint())
                        .map(SetupPublicAddress::value).orElse(null));
        generalConfigDao.findByTypeForUpdate(type());
        String content = JsonUtil.toJson(config);
        if (content == null) {
            throw new IllegalStateException("Public access config serialization failed");
        }
        generalConfigDao.save(GeneralConfig.builder().type(type()).content(content).build());
        PublicAccessConfig saved = super.getConfig();
        if (saved == null) {
            throw new IllegalStateException("Public access config missing after save");
        }
        return saved;
    }

    @Override
    public String type() {
        return GeneralConfigTypeEnum.public_access.name();
    }

    @Override
    public TypeReference<PublicAccessConfig> getTypeReference() {
        return new TypeReference<>() {
            @Override
            public Type getType() {
                return PublicAccessConfig.class;
            }
        };
    }

    private PublicAccessConfig response(Map<String, Object> properties) {
        return new PublicAccessConfig(
                SetupPublicAddress.tryPublicBaseUrl(
                        environment.getProperty(PUBLIC_BASE_URL, text(properties.get(PUBLIC_BASE_URL))))
                        .map(SetupPublicAddress::value).orElse(null),
                SetupPublicAddress.tryServerOtlpEndpoint(
                        environment.getProperty(SERVER_OTLP_HTTP, text(properties.get(SERVER_OTLP_HTTP))))
                        .map(SetupPublicAddress::value).orElse(null),
                SetupPublicAddress.tryServerOtlpEndpoint(
                        environment.getProperty(SERVER_OTLP_GRPC, text(properties.get(SERVER_OTLP_GRPC))))
                        .map(SetupPublicAddress::value).orElse(null));
    }

    private static String text(Object value) {
        return value instanceof String text && !text.isBlank() ? text : null;
    }
}
