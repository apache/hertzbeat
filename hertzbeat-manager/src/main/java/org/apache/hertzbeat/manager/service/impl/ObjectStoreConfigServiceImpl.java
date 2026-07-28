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

import com.obs.services.ObsClient;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.constants.GeneralConfigTypeEnum;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigChangeEvent;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigRequest;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigResponse;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreDTO;
import org.apache.hertzbeat.manager.service.ObjectStoreConfigMapper;
import org.apache.hertzbeat.manager.service.ObjectStoreConfigService;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.util.Assert;
import tools.jackson.core.type.TypeReference;

/**
 * File storage configuration service
 */
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
@Service
public class ObjectStoreConfigServiceImpl extends
        AbstractGeneralConfigServiceImpl<ObjectStoreDTO<ObjectStoreDTO.ObsConfig>>
        implements InitializingBean, ObjectStoreConfigService {

    private static final String BEAN_NAME = "ObjectStoreService";
    @Resource
    private DefaultListableBeanFactory beanFactory;
    @Resource
    private ApplicationContext ctx;

    private final ObjectStoreConfigMapper mapper;

    public ObjectStoreConfigServiceImpl(GeneralConfigDao generalConfigDao, ObjectStoreConfigMapper mapper) {
        super(generalConfigDao);
        this.mapper = mapper;
    }

    @Override
    public String type() {
        return GeneralConfigTypeEnum.oss.name();
    }

    @Override
    public TypeReference<ObjectStoreDTO<ObjectStoreDTO.ObsConfig>> getTypeReference() {
        return new TypeReference<>() {
        };
    }

    @Override
    public ObjectStoreConfigResponse getSafeConfig() {
        ObjectStoreDTO<ObjectStoreDTO.ObsConfig> config = getConfig();
        return config == null ? null : mapper.toResponse(config);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ObjectStoreConfigResponse saveAndGetSafeConfig(ObjectStoreConfigRequest request) {
        generalConfigDao.findByTypeForUpdate(type());
        ObjectStoreDTO<ObjectStoreDTO.ObsConfig> merged = mapper.toConfig(request, getConfig());
        persist(merged);
        ObjectStoreDTO<ObjectStoreDTO.ObsConfig> saved = getConfig();
        if (saved == null) {
            throw new IllegalStateException("Object store config missing after save");
        }
        ctx.publishEvent(new ObjectStoreConfigPersistedEvent(saved));
        return mapper.toResponse(saved);
    }

    @Override
    public void saveConfig(ObjectStoreDTO<ObjectStoreDTO.ObsConfig> config) {
        throw new IllegalArgumentException("Use the dedicated object store config boundary");
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public synchronized void applyCommittedConfig(ObjectStoreConfigPersistedEvent event) {
        applyRuntime(event.config());
        ctx.publishEvent(new ObjectStoreConfigChangeEvent(event.config()));
    }

    private void persist(ObjectStoreDTO<ObjectStoreDTO.ObsConfig> config) {
        String content = JsonUtil.toJson(config);
        if (content == null) {
            throw new IllegalStateException("Object store config serialization failed");
        }
        generalConfigDao.save(GeneralConfig.builder()
                .type(type())
                .content(content)
                .build());
    }

    private void applyRuntime(ObjectStoreDTO<ObjectStoreDTO.ObsConfig> config) {
        if (config != null) {
            if (config.getType() == ObjectStoreDTO.Type.OBS) {
                initObs(config);
            } else {
                beanFactory.destroySingleton(BEAN_NAME);
            }
            return;
        }
        log.warn("object store config is null, please check the configuration file.");
    }

    /**
     * init Huawei Cloud OBS
     */
    private void initObs(ObjectStoreDTO<ObjectStoreDTO.ObsConfig> config) {
        var obsConfig = JsonUtil.convertValue(config.getConfig(), ObjectStoreDTO.ObsConfig.class);
        Assert.hasText(obsConfig.getAccessKey(), "cannot find obs accessKey");
        Assert.hasText(obsConfig.getSecretKey(), "cannot find obs secretKey");
        Assert.hasText(obsConfig.getEndpoint(), "cannot find obs endpoint");
        Assert.hasText(obsConfig.getBucketName(), "cannot find obs bucket name");

        // Add domain name verification for Huawei Cloud OBS endpoint
        validateObsEndpoint(obsConfig.getEndpoint());

        var obsClient = new ObsClient(obsConfig.getAccessKey(), obsConfig.getSecretKey(), obsConfig.getEndpoint());

        beanFactory.destroySingleton(BEAN_NAME);
        beanFactory.registerSingleton(BEAN_NAME, new ObsObjectStoreServiceImpl(obsClient, obsConfig.getBucketName(), obsConfig.getSavePath()));

        log.info("obs store service init success.");
    }

    /**
     * Verify Huawei Cloud OBS endpoint domain name
     * Only myhuaweicloud.com domain name is allowed
     * Refer: <a href="https://console-intl.huaweicloud.com/apiexplorer/#/endpoint">...</a>
     */
    public void validateObsEndpoint(String endpoint) {
        mapper.validateObsEndpoint(endpoint);
    }

    @Override
    public void afterPropertiesSet() throws Exception {
        applyRuntime(getConfig());
    }

    public record ObjectStoreConfigPersistedEvent(ObjectStoreDTO<ObjectStoreDTO.ObsConfig> config) {
    }
}
