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

package org.apache.hertzbeat.startup;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.manager.controller.ObjectStoreConfigController;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigChangeEvent;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigOptions;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigRequest;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreDTO;
import org.apache.hertzbeat.manager.service.ObjectStoreConfigMapper;
import org.apache.hertzbeat.manager.service.impl.ObjectStoreConfigServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.ApplicationListener;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Isolated H2 proof for the dedicated object-store API and committed runtime lifecycle. */
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@SpringBootTest(classes = HertzBeatApplication.class, webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Import(ObjectStoreConfigLifecycleIntegrationTest.RecorderConfiguration.class)
@TestPropertySource(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.datasource.url=jdbc:h2:mem:object-store-lifecycle;MODE=MySQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.flyway.enabled=false",
    "warehouse.store.duckdb.enabled=false"
})
class ObjectStoreConfigLifecycleIntegrationTest {

    @Autowired
    private ObjectStoreConfigController controller;

    @Autowired
    private ObjectStoreConfigServiceImpl service;

    @Autowired
    private ObjectStoreConfigMapper mapper;

    @Autowired
    private GeneralConfigDao generalConfigDao;

    @Autowired
    private DefaultListableBeanFactory beanFactory;

    @Autowired
    private ChangeRecorder committedChanges;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    void apiSaveReloadRestartAndRollbackKeepSecretsAndRuntimeTruthful() throws Exception {
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        Object initialRuntime = beanFactory.getSingleton("ObjectStoreService");

        mockMvc.perform(post("/api/config/oss")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(obsJson("bucket-one", "access-one", "secret-one")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.type").value("OBS"))
                .andExpect(jsonPath("$.data.config.bucketName").value("bucket-one"))
                .andExpect(jsonPath("$.data.configuredSecrets", hasItems("accessKey", "secretKey")))
                .andExpect(content().string(not(containsString("access-one"))))
                .andExpect(content().string(not(containsString("secret-one"))));
        Object firstRuntime = beanFactory.getSingleton("ObjectStoreService");
        assertTrue(firstRuntime != null);
        assertTrue(firstRuntime != initialRuntime);
        assertEquals(1, committedChanges.count());

        mockMvc.perform(post("/api/config/oss")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(obsJson("bucket-two", null, null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.config.bucketName").value("bucket-two"))
                .andExpect(jsonPath("$.data.configuredSecrets", hasItems("accessKey", "secretKey")))
                .andExpect(jsonPath("$.data.config.accessKey").doesNotExist())
                .andExpect(jsonPath("$.data.config.secretKey").doesNotExist());
        Object committedRuntime = beanFactory.getSingleton("ObjectStoreService");
        assertTrue(committedRuntime != firstRuntime);
        assertEquals(2, committedChanges.count());

        mockMvc.perform(get("/api/config/oss"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.config.bucketName").value("bucket-two"))
                .andExpect(jsonPath("$.data.configuredSecrets", hasItems("accessKey", "secretKey")))
                .andExpect(content().string(not(containsString("access-one"))))
                .andExpect(content().string(not(containsString("secret-one"))));

        ObjectStoreConfigServiceImpl restarted = new ObjectStoreConfigServiceImpl(generalConfigDao, mapper);
        assertEquals("bucket-two", restarted.getSafeConfig().config().bucketName());
        assertEquals("access-one", restarted.getConfig().getConfig().getAccessKey());
        assertEquals("secret-one", restarted.getConfig().getConfig().getSecretKey());
        assertEquals(1, generalConfigDao.findAll().stream()
                .filter(config -> "oss".equals(config.getType()))
                .count());

        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        transaction.executeWithoutResult(status -> {
            service.saveAndGetSafeConfig(request("bucket-rolled-back", "access-rollback", "secret-rollback"));
            status.setRollbackOnly();
        });

        assertEquals("bucket-two", service.getSafeConfig().config().bucketName());
        assertSame(committedRuntime, beanFactory.getSingleton("ObjectStoreService"));
        assertEquals(2, committedChanges.count());
    }

    private String obsJson(String bucket, String accessKey, String secretKey) {
        String secrets = accessKey == null
                ? ""
                : "\"accessKey\":\"" + accessKey + "\",\"secretKey\":\"" + secretKey + "\",";
        return "{\"type\":\"OBS\",\"config\":{" + secrets
                + "\"bucketName\":\"" + bucket + "\","
                + "\"endpoint\":\"https://obs.myhuaweicloud.com\","
                + "\"savePath\":\"hertzbeat\"}}";
    }

    private ObjectStoreConfigRequest request(String bucket, String accessKey, String secretKey) {
        ObjectStoreConfigOptions options = new ObjectStoreConfigOptions();
        options.setAccessKey(accessKey);
        options.setSecretKey(secretKey);
        options.setBucketName(bucket);
        options.setEndpoint("https://obs.myhuaweicloud.com");
        options.setSavePath("hertzbeat");
        ObjectStoreConfigRequest request = new ObjectStoreConfigRequest();
        request.setType(ObjectStoreDTO.Type.OBS.name());
        request.setConfig(options);
        return request;
    }

    private static final class ChangeRecorder implements ApplicationListener<ObjectStoreConfigChangeEvent> {

        private final AtomicInteger changes = new AtomicInteger();

        @Override
        public void onApplicationEvent(ObjectStoreConfigChangeEvent event) {
            changes.incrementAndGet();
        }

        private int count() {
            return changes.get();
        }
    }

    @TestConfiguration
    static class RecorderConfiguration {

        @Bean
        ChangeRecorder objectStoreChangeRecorder() {
            return new ChangeRecorder();
        }
    }
}
