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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import org.apache.hertzbeat.common.runtime.BusinessRuntimeGate;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceErrorCode;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceException;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceOrchestrator;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupOperationState;
import org.apache.hertzbeat.manager.setup.runtime.SetupRuntimeTransition;
import org.apache.hertzbeat.manager.setup.workflow.SetupOperationRegistry;
import org.apache.hertzbeat.manager.setup.workflow.SetupRuntimeState;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

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

    @TempDir
    Path installationRoot;

    @Test
    void awaitingRestartOperationConvergesAcrossContextRebuild() {
        String operationId = createAwaitingRestartOperation(installationRoot.resolve("success"));
        try (ConfigurableApplicationContext context = operationContext(
                installationRoot.resolve("success"), SetupPhase.ADMINISTRATOR_REQUIRED)) {
            var operation = context.getBean(SetupOperationRegistry.class).get(operationId);

            assertNotNull(operation);
            assertEquals(SetupOperationState.SUCCEEDED, operation.state());
            assertEquals(SetupPhase.ADMINISTRATOR_REQUIRED, operation.phase());
            assertNotNull(operation.completedAt());
            assertEquals(0, operation.nextPollAfterMillis());
            assertNull(context.getBean(SetupOperationRegistry.class).get("unknown-operation"));
        }
    }

    @Test
    void awaitingRestartOperationBecomesFailedDuringRecovery() {
        Path root = installationRoot.resolve("recovery");
        String operationId = createAwaitingRestartOperation(root);
        try (ConfigurableApplicationContext context = operationContext(root, SetupPhase.RECOVERY_REQUIRED)) {
            var operation = context.getBean(SetupOperationRegistry.class).get(operationId);

            assertNotNull(operation);
            assertEquals(SetupOperationState.FAILED, operation.state());
            assertEquals(SetupPhase.RECOVERY_REQUIRED, operation.phase());
            assertEquals(SetupErrorCode.CONFIG_RECOVERY_REQUIRED, operation.errorCode());
            assertNotNull(operation.completedAt());
        }
    }

    @Test
    void fullGatedSurenessChainKeepsSetupReachableAndBusinessRoutesClosed() throws Exception {
        SpringStartupContextLauncher launcher = new SpringStartupContextLauncher();
        StartupDecision decision = new StartupDecision(RuntimeMode.FULL_SETUP_GATED);
        String databaseName = "m5_setup_security_" + System.nanoTime();
        try (ConfigurableApplicationContext context = launcher.launchSpringContext(decision, new String[]{
                "--spring.profiles.active=test",
                "--server.port=0",
                "--spring.datasource.url=jdbc:h2:mem:" + databaseName + ";MODE=MYSQL;DB_CLOSE_DELAY=-1",
                "--spring.flyway.enabled=false",
                "--hertzbeat.installation.root=" + installationRoot,
                "--warehouse.store.duckdb.enabled=false",
                "--warehouse.store.greptime.enabled=false",
                "--hertzbeat.runtime.mode=normal"
        }, SETUP_RUNTIME_TRANSITION);
             HttpClient client = HttpClient.newHttpClient()) {
            int port = ((WebServerApplicationContext) context).getWebServer().getPort();

            HttpResponse<String> status = client.send(
                    request(port, "/api/setup/status").GET().build(), HttpResponse.BodyHandlers.ofString());
            assertEquals(200, status.statusCode());
            assertEquals("administrator_required", JsonUtil.fromJson(status.body()).path("phase").asText());

            HttpResponse<String> business = client.send(
                    request(port, "/api/monitors").GET().build(), HttpResponse.BodyHandlers.ofString());
            assertEquals(503, business.statusCode());
            assertEquals("setup_not_complete", JsonUtil.fromJson(business.body()).path("msg").asText());

            SetupRuntimeState state = context.getBean(SetupRuntimeState.class);
            state.administratorCreated("admin");
            state.complete();
            HttpResponse<String> completedWrite = client.send(request(port, "/api/setup/administrator")
                            .header("Content-Type", "application/json")
                            .POST(HttpRequest.BodyPublishers.ofString(
                                    "{\"username\":\"admin\",\"password\":\"not-retained\"}"))
                            .build(),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(410, completedWrite.statusCode());
            assertEquals("setup_complete", JsonUtil.fromJson(completedWrite.body()).path("errorCode").asText());
        }
    }

    @Test
    void realFullApplicationStartsGatedWithoutBusinessSideEffectsOrCliBypass() {
        SpringStartupContextLauncher launcher = new SpringStartupContextLauncher();
        StartupDecision decision = new StartupDecision(RuntimeMode.FULL_SETUP_GATED);
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
            assertFalse(context.containsBeanDefinition("collectorLifecycleMaintenanceParticipant"));
            MigrationMaintenanceOrchestrator orchestrator =
                    context.getBean(MigrationMaintenanceOrchestrator.class);
            try {
                orchestrator.acquire("gated-proof", Duration.ZERO);
                org.junit.jupiter.api.Assertions.fail("Gated runtime must fail closed");
            } catch (MigrationMaintenanceException exception) {
                assertEquals(MigrationMaintenanceErrorCode.MIGRATION_DEPLOYMENT_AUTHORITY_UNAVAILABLE,
                        exception.code());
            }
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
        StartupDecision decision = new StartupDecision(RuntimeMode.SETUP_ONLY);
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

    private static HttpRequest.Builder request(int port, String path) {
        return HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path));
    }

    private static String createAwaitingRestartOperation(Path root) {
        try (ConfigurableApplicationContext context = operationContext(root, SetupPhase.CONFIGURATION_REQUIRED)) {
            SetupOperationRegistry operations = context.getBean(SetupOperationRegistry.class);
            String operationId = operations.begin(SetupPhase.CONFIGURATION_REQUIRED);
            operations.finish(operationId, SetupOperationState.AWAITING_RESTART,
                    SetupPhase.APPLICATION_STARTING, null, false);
            return operationId;
        }
    }

    private static ConfigurableApplicationContext operationContext(Path root, SetupPhase phase) {
        AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext();
        context.registerBean(SetupOperationRegistry.class,
                () -> new SetupOperationRegistry(Clock.systemUTC(), root, phase));
        context.refresh();
        return context;
    }
}
