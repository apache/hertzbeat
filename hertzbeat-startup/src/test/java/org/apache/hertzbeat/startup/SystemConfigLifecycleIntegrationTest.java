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
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.support.event.SystemConfigChangeEvent;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.controller.GeneralConfigController;
import org.apache.hertzbeat.manager.pojo.dto.SystemConfig;
import org.apache.hertzbeat.manager.pojo.dto.SystemConfigRequest;
import org.apache.hertzbeat.manager.service.impl.SystemGeneralConfigServiceImpl;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
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

/** Isolated H2 proof for the dedicated system-config API and committed runtime lifecycle. */
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@SpringBootTest(classes = HertzBeatApplication.class, webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Import(SystemConfigLifecycleIntegrationTest.RecorderConfiguration.class)
@TestPropertySource(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.datasource.url=jdbc:h2:mem:system-config-lifecycle;MODE=MySQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.flyway.enabled=false",
    "warehouse.store.duckdb.enabled=false"
})
class SystemConfigLifecycleIntegrationTest {

    private static final TimeZone ORIGINAL_TIME_ZONE = TimeZone.getDefault();
    private static final Locale ORIGINAL_LOCALE = Locale.getDefault();

    static {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Shanghai"));
        Locale.setDefault(Locale.FRANCE);
    }

    @Autowired
    private GeneralConfigController controller;

    @Autowired
    private SystemGeneralConfigServiceImpl service;

    @Autowired
    private GeneralConfigDao generalConfigDao;

    @Autowired
    private ChangeRecorder committedChanges;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    void apiSaveReloadRestartFailureAndRollbackKeepRuntimeTruthful() throws Exception {
        TimeZone originalTimeZone = TimeZone.getDefault();
        Locale originalLocale = Locale.getDefault();
        try {
            MockMvc mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
            assertEquals(new SystemConfig("Asia/Shanghai", "en_US", "dark-ops"), service.getConfig());
            assertRuntime("Asia/Shanghai", Locale.US);
            assertEquals(1, generalConfigDao.findAll().stream()
                    .filter(config -> "system".equals(config.getType()))
                    .count());
            committedChanges.reset();

            generalConfigDao.save(GeneralConfig.builder()
                    .type("system")
                    .content(JsonUtil.toJson(new SystemConfig("Asia/Shanghai", "fr_FR", "default")))
                    .build());
            assertEquals(new SystemConfig("Asia/Shanghai", "en_US", "dark-ops"),
                    service.initializeCanonicalConfig());
            assertEquals(new SystemConfig("Asia/Shanghai", "en_US", "dark-ops"), service.getConfig());
            assertRuntime("Asia/Shanghai", Locale.US);
            assertEquals(1, committedChanges.count());
            assertEquals(1, generalConfigDao.findAll().stream()
                    .filter(config -> "system".equals(config.getType()))
                    .count());
            committedChanges.reset();

            mockMvc.perform(post("/api/config/system")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(configJson("Asia/Shanghai", "ja_JP", "light-ops")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                    .andExpect(jsonPath("$.data.timeZoneId").value("Asia/Shanghai"))
                    .andExpect(jsonPath("$.data.locale").value("ja_JP"))
                    .andExpect(jsonPath("$.data.theme").value("light-ops"));
            assertRuntime("Asia/Shanghai", Locale.forLanguageTag("ja-JP"));
            assertEquals(1, committedChanges.count());

            mockMvc.perform(post("/api/config/system")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(configJson("UTC", "en_US", "compact")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.timeZoneId").value("UTC"))
                    .andExpect(jsonPath("$.data.locale").value("en_US"))
                    .andExpect(jsonPath("$.data.theme").value("compact"));
            assertRuntime("UTC", Locale.US);
            assertEquals(2, committedChanges.count());

            mockMvc.perform(get("/api/config/system"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.timeZoneId").value("UTC"))
                    .andExpect(jsonPath("$.data.locale").value("en_US"))
                    .andExpect(jsonPath("$.data.theme").value("compact"));

            SystemGeneralConfigServiceImpl restarted = new SystemGeneralConfigServiceImpl(generalConfigDao);
            assertEquals(new SystemConfig("UTC", "en_US", "compact"), restarted.getConfig());
            assertEquals(1, generalConfigDao.findAll().stream()
                    .filter(config -> "system".equals(config.getType()))
                    .count());

            mockMvc.perform(post("/api/config/system")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(configJson("invalid-zone-sentinel", "en_US", "dark-ops")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.msg").value("Invalid system config"))
                    .andExpect(content().string(not(containsString("invalid-zone-sentinel"))));
            assertRuntime("UTC", Locale.US);
            assertEquals(2, committedChanges.count());

            TransactionTemplate transaction = new TransactionTemplate(transactionManager);
            transaction.executeWithoutResult(status -> {
                service.saveAndGetConfig(request("Asia/Tokyo", "pt_BR", "dark-ops"));
                assertRuntime("UTC", Locale.US);
                assertEquals(2, committedChanges.count());
                status.setRollbackOnly();
            });

            assertEquals(new SystemConfig("UTC", "en_US", "compact"), service.getConfig());
            assertRuntime("UTC", Locale.US);
            assertEquals(2, committedChanges.count());
            assertEquals(1, generalConfigDao.findAll().stream()
                    .filter(config -> "system".equals(config.getType()))
                    .count());
        } finally {
            TimeZone.setDefault(originalTimeZone);
            Locale.setDefault(originalLocale);
        }
    }

    @AfterAll
    static void restoreHostDefaults() {
        TimeZone.setDefault(ORIGINAL_TIME_ZONE);
        Locale.setDefault(ORIGINAL_LOCALE);
    }

    private static void assertRuntime(String timeZoneId, Locale locale) {
        assertEquals(timeZoneId, TimeZone.getDefault().getID());
        assertEquals(locale, Locale.getDefault());
    }

    private static String configJson(String timeZoneId, String locale, String theme) {
        return "{\"timeZoneId\":\"" + timeZoneId + "\",\"locale\":\"" + locale
                + "\",\"theme\":\"" + theme + "\"}";
    }

    private static SystemConfigRequest request(String timeZoneId, String locale, String theme) {
        SystemConfigRequest request = new SystemConfigRequest();
        request.setTimeZoneId(timeZoneId);
        request.setLocale(locale);
        request.setTheme(theme);
        return request;
    }

    private static final class ChangeRecorder implements ApplicationListener<SystemConfigChangeEvent> {

        private final AtomicInteger changes = new AtomicInteger();

        @Override
        public void onApplicationEvent(SystemConfigChangeEvent event) {
            changes.incrementAndGet();
        }

        private int count() {
            return changes.get();
        }

        private void reset() {
            changes.set(0);
        }
    }

    @TestConfiguration
    static class RecorderConfiguration {

        @Bean
        ChangeRecorder systemConfigChangeRecorder() {
            return new ChangeRecorder();
        }
    }
}
