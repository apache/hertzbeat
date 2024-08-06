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

package org.apache.hertzbeat.manager.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.manager.dao.GeneralConfigDao;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigChangeEvent;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreDTO;
import org.apache.hertzbeat.manager.service.impl.ObjectStoreConfigServiceImpl;
import org.apache.hertzbeat.manager.service.impl.ObsObjectStoreServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * test case for {@link ObjectStoreConfigServiceImpl}
 */

@ExtendWith(SpringExtension.class)
@SpringBootTest
class ObjectStoreConfigServiceTest {

	@MockBean
	private GeneralConfigDao generalConfigDao;

	@Mock
	private ObjectMapper objectMapper;

	@Autowired
	private DefaultListableBeanFactory beanFactory;

	@MockBean
	private ApplicationContext ctx;

	private ObjectStoreDTO<ObjectStoreDTO.ObsConfig> config;

	private ObjectStoreDTO.ObsConfig obsConfig;

	private ObjectStoreConfigServiceImpl objectStoreConfigService;

	@BeforeEach
	public void setUp() {

		MockitoAnnotations.openMocks(this);

		this.config = new ObjectStoreDTO<>();
		this.obsConfig = new ObjectStoreDTO.ObsConfig();
		obsConfig.setAccessKey("testAccessKey");
		obsConfig.setSecretKey("testSecretKey");
		obsConfig.setEndpoint("testEndpoint");
		obsConfig.setBucketName("testBucketName");
		config.setType(ObjectStoreDTO.Type.OBS);
		config.setConfig(obsConfig);
		this.objectStoreConfigService = new ObjectStoreConfigServiceImpl(generalConfigDao, objectMapper);

		ReflectionTestUtils.setField(objectStoreConfigService, "beanFactory", beanFactory);
		ReflectionTestUtils.setField(objectStoreConfigService, "ctx", ctx);
	}

	@Test
	public void testType() {

		assertEquals("oss", objectStoreConfigService.type());
	}

	@Test
	public void testHandlerWithObsConfig() {

		when(objectMapper.convertValue(any(), eq(ObjectStoreDTO.ObsConfig.class))).thenReturn(obsConfig);

		objectStoreConfigService.handler(config);

		verify(ctx).publishEvent(any(ObjectStoreConfigChangeEvent.class));
	}

}
