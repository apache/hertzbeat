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

import tools.jackson.core.type.TypeReference;
import com.obs.services.ObsClient;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.GeneralConfigTypeEnum;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
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
import org.springframework.util.Assert;

import jakarta.annotation.Resource;
import java.lang.reflect.Type;

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
            @Override
            public Type getType() {
                return ObjectStoreDTO.class;
            }
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
        // Serialize credential merge, persistence, runtime replacement, and authoritative reread.
        generalConfigDao.findByTypeForUpdate(type());
        ObjectStoreDTO<ObjectStoreDTO.ObsConfig> merged = mapper.toConfig(request, getConfig());
        super.saveConfig(merged);
        ObjectStoreDTO<ObjectStoreDTO.ObsConfig> saved = getConfig();
        if (saved == null) {
            throw new IllegalStateException("Object store config missing after save");
        }
        return mapper.toResponse(saved);
    }

    @Override
    public void handler(ObjectStoreDTO<ObjectStoreDTO.ObsConfig> config) {
        // initialize file storage service
        if (config != null) {
            if (config.getType() == ObjectStoreDTO.Type.OBS) {
                initObs(config);
                // case other object store service
            }
            ctx.publishEvent(new ObjectStoreConfigChangeEvent(config));
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
        // init file storage
        handler(getConfig());
    }
}
