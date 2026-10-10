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

package org.apache.hertzbeat.alert.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.impl.AlertManagerExternAlertService;
import org.apache.hertzbeat.alert.service.impl.AlibabaCloudSlsExternAlertService;
import org.apache.hertzbeat.alert.service.impl.DefaultExternAlertService;
import org.apache.hertzbeat.alert.service.impl.HuaweiCloudExternAlertService;
import org.apache.hertzbeat.alert.service.impl.PrometheusExternAlertService;
import org.apache.hertzbeat.alert.service.impl.SkyWalkingExternAlertService;
import org.apache.hertzbeat.alert.service.impl.TencentExternAlertService;
import org.apache.hertzbeat.alert.service.impl.UptimeKumaExternAlertServiceImpl;
import org.apache.hertzbeat.alert.service.impl.VolcEngineExternAlertService;
import org.apache.hertzbeat.alert.service.impl.ZabbixExternAlertServiceImpl;
import org.junit.jupiter.api.Test;

class AlertIntegrationSourceContractTest {

    private static final Set<String> BACKEND_SOURCES = Set.of(
            "default", "alertmanager", "prometheus", "skywalking", "uptime-kuma", "zabbix", "tencent",
            "alibabacloud-sls", "huaweicloud-ces", "volcengine");

    @Test
    void actualServicesMatchTheRetiredAngularStaticCatalog() {
        AlarmCommonReduce reducer = mock(AlarmCommonReduce.class);
        List<ExternAlertService> services = List.of(
                new DefaultExternAlertService(),
                new AlertManagerExternAlertService(),
                new PrometheusExternAlertService(),
                new SkyWalkingExternAlertService(),
                new UptimeKumaExternAlertServiceImpl(),
                new ZabbixExternAlertServiceImpl(),
                new TencentExternAlertService(),
                new AlibabaCloudSlsExternAlertService(reducer),
                new HuaweiCloudExternAlertService(reducer),
                new VolcEngineExternAlertService(reducer));

        assertEquals(BACKEND_SOURCES, services.stream()
                .map(ExternAlertService::supportSource)
                .collect(Collectors.toSet()));
    }

    @Test
    void ingressCodeNeverLogsRawBodiesOrExceptionDetails() throws IOException {
        Path sourceRoot = repoRoot().resolve("hertzbeat-alerter/src/main/java/org/apache/hertzbeat/alert");
        List<Path> sources;
        try (Stream<Path> paths = Files.list(sourceRoot.resolve("service/impl"))) {
            sources = new ArrayList<>(paths
                    .filter(path -> path.getFileName().toString().contains("ExternAlertService"))
                    .toList());
        }
        sources.add(sourceRoot.resolve("controller/AlertReportController.java"));

        for (Path source : sources) {
            for (String line : Files.readAllLines(source)) {
                if (line.contains("log.")) {
                    assertFalse(line.contains(", content"), () -> source + " logs a raw alert body");
                    assertFalse(line.contains("getMessage()"), () -> source + " logs exception details");
                    assertFalse(line.contains("responseBody"), () -> source + " logs a remote response body");
                    assertFalse(line.contains("externAlert.getMessage()"), () -> source + " logs an alert message body");
                }
                assertFalse(line.contains("JsonUtil.fromJson("),
                        () -> source + " must use non-logging JSON parsing for ingress data");
            }
        }
    }

    private static Path repoRoot() {
        Path current = Paths.get("").toAbsolutePath();
        while (current != null && !Files.exists(current.resolve("hertzbeat-alerter/pom.xml"))) {
            current = current.getParent();
        }
        if (current == null) {
            throw new IllegalStateException("Cannot locate HertzBeat repository root");
        }
        return current;
    }
}
