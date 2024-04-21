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

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.obs.services.ObsClient;
import java.lang.reflect.Type;
import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.manager.dao.GeneralConfigDao;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigChangeEvent;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreDTO;
import org.apache.poi.ss.formula.functions.T;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;
import org.springframework.util.Assert;

/**
 * 文件存储配置服务
 * File storage configuration service
 */
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
@Service
public class ObjectStoreConfigServiceImpl extends AbstractGeneralConfigServiceImpl<ObjectStoreDTO<T>> implements InitializingBean {
    @Resource
    private DefaultListableBeanFactory beanFactory;

    @Resource
    private ApplicationContext ctx;

    private static final String BEAN_NAME = "ObjectStoreService";

    /**
     * 构造方法，传入GeneralConfigDao、ObjectMapper和type。
     *
     * <p>Constructor, passing in GeneralConfigDao, ObjectMapper and type.</p>
     *
     * @param generalConfigDao 配置Dao对象
     * @param objectMapper     JSON工具类对象
     */
    protected ObjectStoreConfigServiceImpl(GeneralConfigDao generalConfigDao, ObjectMapper objectMapper) {
        super(generalConfigDao, objectMapper);
    }

    @Override
    public String type() {
        return "oss";
    }

    @Override
    protected TypeReference<ObjectStoreDTO<T>> getTypeReference() {
        return new TypeReference<>() {
            @Override
            public Type getType() {
                return ObjectStoreDTO.class;
            }
        };
    }

    @Override
    public void handler(ObjectStoreDTO<T> config) {
        // 初始化文件存储服务
        if (config != null) {
            if (config.getType() == ObjectStoreDTO.Type.OBS) {
                initObs(config);
                // case other object store service
            }
            ctx.publishEvent(new ObjectStoreConfigChangeEvent(config));
        }
    }

    /**
     * 初始化华为云OBS
     */
    private void initObs(ObjectStoreDTO<T> config) {
        var obsConfig = objectMapper.convertValue(config.getConfig(), ObjectStoreDTO.ObsConfig.class);
        Assert.hasText(obsConfig.getAccessKey(), "cannot find obs accessKey");
        Assert.hasText(obsConfig.getSecretKey(), "cannot find obs secretKey");
        Assert.hasText(obsConfig.getEndpoint(), "cannot find obs endpoint");
        Assert.hasText(obsConfig.getBucketName(), "cannot find obs bucket name");

        var obsClient = new ObsClient(obsConfig.getAccessKey(), obsConfig.getSecretKey(), obsConfig.getEndpoint());

        beanFactory.destroySingleton(BEAN_NAME);
        beanFactory.registerSingleton(BEAN_NAME, new ObsObjectStoreServiceImpl(obsClient, obsConfig.getBucketName(), obsConfig.getSavePath()));

        log.info("obs store service init success.");
    }

    @Override
    public void afterPropertiesSet() throws Exception {
        // 初始化文件存储
        handler(getConfig());
    }
}
