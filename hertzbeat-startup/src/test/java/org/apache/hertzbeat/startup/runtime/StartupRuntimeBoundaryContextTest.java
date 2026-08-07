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

package org.apache.hertzbeat.startup.runtime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.common.runtime.BusinessRuntimeGate;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.runtime.SetupRuntimeTransition;
import org.junit.jupiter.api.Test;
import org.springframework.context.ConfigurableApplicationContext;

class StartupRuntimeBoundaryContextTest {

    private static final SetupRuntimeTransition SETUP_RUNTIME_TRANSITION = () -> { };

    private static final String[] SIDE_EFFECT_BEANS = {
            "schedulerInit", "manageServerLifecycle", "periodicAlertRuleSchedulerLifecycle", "noticeTemplateInitializer",
            "otlpGrpcServerConfig", "serviceDiscoveryWorker",
            "openTelemetryLogbackAppenderInstaller", "windowedLogRealTimeAlertCalculator", "timeService",
            "windowAggregator", "grafanaInit", "sopScheduleExecutor", "greptimeApmFlowInitializer",
            "greptimeLogPipelineInitializer", "greptimeTraceTableInitializer",
            "greptimeTtlApplicationReadyListener", "calculateStatusLifecycle", "alarmReduceLifecycle",
            "legacyLogSseManagerLifecycle", "observabilityLogSseManagerLifecycle",
            "managerBusinessRuntimeInitializer", "llmConfigInitializer", "dorisDataStorage",
            "tdEngineDataStorage", "influxdbDataStorage", "iotDbDataStorage", "duckdbDatabaseDataStorage",
            "greptimeDbDataStorage", "victoriaMetricsDataStorage", "victoriaMetricsClusterDataStorage",
            "questdbDataStorage"
    };

    @Test
    void realFullApplicationStartsGatedWithoutBusinessSideEffectsOrCliBypass() {
        SpringStartupContextLauncher launcher = new SpringStartupContextLauncher();
        StartupDecision decision = new StartupDecision(
                RuntimeMode.FULL_SETUP_GATED, SetupPhase.ADMINISTRATOR_REQUIRED, null);
        String databaseName = "m2_gated_" + System.nanoTime();
        try (ConfigurableApplicationContext context = launcher.launchSpringContext(decision, new String[]{
                "--spring.profiles.active=test",
                "--spring.main.web-application-type=none",
                "--spring.datasource.url=jdbc:h2:mem:" + databaseName + ";MODE=MYSQL;DB_CLOSE_DELAY=-1",
                "--spring.flyway.enabled=false",
                "--warehouse.store.doris.enabled=true",
                "--warehouse.store.td-engine.enabled=true",
                "--warehouse.store.influxdb.enabled=true",
                "--warehouse.store.iot-db.enabled=true",
                "--warehouse.store.duckdb.enabled=true",
                "--warehouse.store.greptime.enabled=true",
                "--warehouse.store.victoria-metrics.enabled=true",
                "--warehouse.store.victoria-metrics.cluster.enabled=true",
                "--warehouse.store.questdb.enabled=true",
                "--hertzbeat.runtime.mode=normal"
        }, SETUP_RUNTIME_TRANSITION)) {
            BusinessRuntimeGate gate = context.getBean(BusinessRuntimeGate.class);
            assertSame(SETUP_RUNTIME_TRANSITION, context.getBean(SetupRuntimeTransition.class));
            assertEquals(RuntimeMode.FULL_SETUP_GATED, gate.mode());
            assertFalse(gate.isOpen());
            assertTrue(context.containsBeanDefinition("periodicAlertRuleScheduler"));
            assertTrue(context.containsBeanDefinition("manageServer"));
            assertTrue(context.containsBeanDefinition("otlpGrpcMetricsService"));
            assertTrue(context.containsBeanDefinition("alarmGroupReduce"));
            assertTrue(context.containsBeanDefinition("alarmInhibitReduce"));
            assertTrue(context.containsBeanDefinition("calculateStatus"));
            assertTrue(context.containsBeanDefinition("objectStoreConfigServiceImpl"));
            assertTrue(context.containsBeanDefinition("appServiceImpl"));
            assertTrue(context.containsBeanDefinition("pluginParameterServiceImpl"));
            assertTrue(context.containsBeanDefinition("pluginServiceImpl"));
            assertTrue(context.containsBeanDefinition("llmConfig"));
            for (String beanName : SIDE_EFFECT_BEANS) {
                assertFalse(context.containsBeanDefinition(beanName), beanName);
            }
        }
    }

    @Test
    void setupOnlySourceStartsWithoutBusinessAutoConfiguration() {
        SpringStartupContextLauncher launcher = new SpringStartupContextLauncher();
        StartupDecision decision = new StartupDecision(
                RuntimeMode.SETUP_ONLY, SetupPhase.CONFIGURATION_REQUIRED, null);
        try (ConfigurableApplicationContext context = launcher.launchSpringContext(decision,
                new String[]{"--spring.main.web-application-type=none", "--hertzbeat.runtime.mode=normal"},
                SETUP_RUNTIME_TRANSITION)) {
            BusinessRuntimeGate gate = context.getBean(BusinessRuntimeGate.class);
            assertSame(SETUP_RUNTIME_TRANSITION, context.getBean(SetupRuntimeTransition.class));
            assertEquals(RuntimeMode.SETUP_ONLY, gate.mode());
            assertFalse(context.containsBeanDefinition("managerAutoConfiguration"));
            assertFalse(context.containsBeanDefinition("entityManagerFactory"));
            assertFalse(context.containsBeanDefinition("dataSource"));
            assertFalse(context.containsBeanDefinition("flyway"));
            assertFalse(context.containsBeanDefinition("grafanaAutoConfiguration"));
            assertFalse(context.containsBeanDefinition("alerterAutoConfiguration"));
            assertFalse(context.containsBeanDefinition("collectorAutoConfiguration"));
            assertFalse(context.containsBeanDefinition("warehouseAutoConfiguration"));
            assertFalse(context.containsBeanDefinition("otlpGrpcServerConfig"));
        }
    }
}
