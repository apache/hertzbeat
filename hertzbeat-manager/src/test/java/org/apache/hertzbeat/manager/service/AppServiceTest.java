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

import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.RuntimeParamDefine;
import org.apache.hertzbeat.common.entity.job.protocol.SshProtocol;
import org.apache.hertzbeat.common.entity.manager.Define;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.dao.DefineDao;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigChangeEvent;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreDTO;
import org.apache.hertzbeat.manager.pojo.dto.ParamDefineInfo;
import org.apache.hertzbeat.manager.service.impl.AppServiceImpl;
import org.apache.hertzbeat.manager.service.impl.ObjectStoreConfigServiceImpl;
import org.apache.hertzbeat.warehouse.service.WarehouseService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * Test case for {@link AppService}
 */
@ExtendWith(MockitoExtension.class)
class AppServiceTest {

    @InjectMocks
    private AppServiceImpl appService;

    @Mock
    private MonitorDao monitorDao;

    @Mock
    private DefineDao defineDao;

    @Mock
    private WarehouseService warehouseService;

    @Mock
    private ObjectStoreConfigServiceImpl objectStoreConfigService;

    @BeforeEach
    void setUp() throws Exception {
        when(defineDao.findAll()).thenReturn(new ArrayList<>());
        appService.afterPropertiesSet();
    }

    @Test
    void getAppParamDefines() {
        assertDoesNotThrow(() -> appService.getAppParamDefines("jvm"));
    }

    @Test
    void credentialParametersUsePasswordType() {
        assertEquals("password", findParam("ollama", "apiKey").getType());
        assertEquals("password", findParam("http_sd", "__sd_token__").getType());
    }

    @Test
    void getAppParamDefinesShouldNotContainDuplicateFields() {
        List<ParamDefineInfo> paramDefines = appService.getAppParamDefines("nvidia");
        Map<String, Long> fieldCounts = paramDefines.stream()
                .collect(Collectors.groupingBy(ParamDefineInfo::getField, Collectors.counting()));

        assertTrue(fieldCounts.values().stream().allMatch(count -> count == 1),
                () -> "Duplicate param fields found: " + fieldCounts.entrySet().stream()
                        .filter(entry -> entry.getValue() > 1)
                        .map(Map.Entry::getKey)
                        .collect(Collectors.joining(", ")));
    }

    @Test
    void getAppDefine() {
        assertDoesNotThrow(() -> appService.getAppDefine("jvm"));
        assertThrows(IllegalArgumentException.class, () -> appService.getAppDefine("unknown"));
    }

    @Test
    void linuxCpuScriptAlwaysEmitsOneLinePerAlias(@TempDir Path tempDir) throws Exception {
        String script = getCpuScript("linux");
        for (String app : List.of("ubuntu", "centos", "debian", "almalinux", "euleros",
                "opensuse", "rockylinux", "coreos", "redhat")) {
            assertEquals(script, getCpuScript(app), app + " should keep the shared Linux CPU script");
        }

        String vmstatOutput = "procs memory swap io system cpu\n"
                + "r b swpd free buff cache si so bi bo in cs us sy id wa st\n"
                + "0 0 0 0 0 0 0 0 0 0 111 222 1 2 95 0 0\n"
                + "0 0 0 0 0 0 0 0 0 0 112 223 1 2 94 0 0\n";
        String cpuInfo = "processor : 0\nprocessor : 1\nprocessor : 2\nprocessor : 3\n";
        String loadAverage = "0.10 0.20 0.30 1/100 123\n";
        List<String> missingModel = runCpuScript(script, tempDir,
                "Architecture: aarch64\nCPU(s): 4\n", cpuInfo, loadAverage, vmstatOutput, false, false);
        assertEquals(List.of("unknown", "4", "0.10 0.20 0.30", "111", "222", "94"), missingModel);

        List<String> oneModel = runCpuScript(script, tempDir,
                "Model name: Synthetic ARM CPU\n", cpuInfo, loadAverage, vmstatOutput, false, false);
        assertEquals(List.of("Synthetic ARM CPU", "4", "0.10 0.20 0.30", "111", "222", "94"), oneModel);

        List<String> multipleModels = runCpuScript(script, tempDir,
                "Model name: Synthetic CPU A\nModel name: Synthetic CPU A\nModel name: Synthetic CPU B\n",
                cpuInfo, loadAverage, vmstatOutput, false, false);
        assertEquals("Synthetic CPU A, Synthetic CPU B", multipleModels.get(0));
        assertEquals(6, multipleModels.size());

        List<String> localizedModel = runCpuScript(script, tempDir,
                "Nom du modèle: Synthetic ARM CPU\n", cpuInfo, loadAverage, vmstatOutput, false, false);
        assertEquals("unknown", localizedModel.get(0));
        assertEquals(6, localizedModel.size());

        assertCpuScriptFails(script, tempDir, "", cpuInfo, loadAverage, vmstatOutput, true, false,
                "lscpu failed");
        assertCpuScriptFails(script, tempDir, "Model name: Synthetic ARM CPU\n", "", loadAverage,
                vmstatOutput, false, false, "CPU core count unavailable");
        assertCpuScriptFails(script, tempDir, "Model name: Synthetic ARM CPU\n", cpuInfo, "",
                vmstatOutput, false, false, "CPU load average unavailable");
        assertCpuScriptFails(script, tempDir, "Model name: Synthetic ARM CPU\n", cpuInfo, loadAverage,
                "", false, false, "vmstat interrupt/context-switch values unavailable");
        String invalidVmstat = vmstatOutput.replace("111 222", "bad 222");
        assertCpuScriptFails(script, tempDir, "Model name: Synthetic ARM CPU\n", cpuInfo, loadAverage,
                invalidVmstat, false, false, "vmstat interrupt/context-switch values unavailable");
        assertCpuScriptFails(script, tempDir, "Model name: Synthetic ARM CPU\n", cpuInfo, loadAverage,
                vmstatOutput, false, true, "vmstat first sample failed");
    }

    private String getCpuScript(String app) {
        return appService.getAppDefine(app).getMetrics().stream()
                .filter(metric -> "cpu".equals(metric.getName()))
                .map(Metrics::getSsh)
                .map(SshProtocol::getScript)
                .findFirst()
                .orElseThrow();
    }

    private List<String> runCpuScript(String script, Path tempDir, String lscpuOutput,
            String cpuInfo, String loadAverage, String vmstatOutput, boolean failLscpu, boolean failVmstat)
            throws Exception {
        ShellResult result = executeCpuScript(script, tempDir, lscpuOutput, cpuInfo, loadAverage,
                vmstatOutput, failLscpu, failVmstat);
        assertEquals(0, result.exitCode(), result.stderr());
        return result.stdout().lines().toList();
    }

    private void assertCpuScriptFails(String script, Path tempDir, String lscpuOutput,
            String cpuInfo, String loadAverage, String vmstatOutput, boolean failLscpu, boolean failVmstat,
            String expectedError) throws Exception {
        ShellResult result = executeCpuScript(script, tempDir, lscpuOutput, cpuInfo, loadAverage,
                vmstatOutput, failLscpu, failVmstat);
        assertTrue(result.exitCode() > 1, result.stderr());
        assertTrue(result.stdout().isBlank(), "failed CPU script must not emit a successful-looking partial row");
        assertTrue(result.stderr().contains(expectedError), result.stderr());
    }

    private ShellResult executeCpuScript(String script, Path tempDir, String lscpuOutput,
            String cpuInfo, String loadAverage, String vmstatOutput, boolean failLscpu, boolean failVmstat)
            throws Exception {
        Path cpuInfoFile = tempDir.resolve("cpuinfo");
        Path loadAverageFile = tempDir.resolve("loadavg");
        Files.writeString(cpuInfoFile, cpuInfo, StandardCharsets.UTF_8);
        Files.writeString(loadAverageFile, loadAverage, StandardCharsets.UTF_8);
        String isolatedScript = script.replace("/proc/cpuinfo", cpuInfoFile.toString())
                .replace("/proc/loadavg", loadAverageFile.toString());
        String shellFunctions = "lscpu() { [ \"$LC_ALL\" = C ] || return 77; "
                + "if [ \"$LSCPU_FAIL\" = 1 ]; then echo 'synthetic lscpu command failed' >&2; return 2; fi; "
                + "printf '%s\\n' \"$LSCPU_OUTPUT\"; }; "
                + "vmstat() { if [ \"$VMSTAT_FAIL\" = 1 ]; then echo 'synthetic vmstat command failed' >&2; return 2; fi; "
                + "printf '%s\\n' \"$VMSTAT_OUTPUT\"; }; ";
        ProcessBuilder processBuilder = new ProcessBuilder("/bin/sh", "-c", shellFunctions + isolatedScript);
        processBuilder.environment().put("LSCPU_OUTPUT", lscpuOutput);
        processBuilder.environment().put("VMSTAT_OUTPUT", vmstatOutput);
        processBuilder.environment().put("LSCPU_FAIL", failLscpu ? "1" : "0");
        processBuilder.environment().put("VMSTAT_FAIL", failVmstat ? "1" : "0");
        Process process = processBuilder.start();
        process.getOutputStream().close();
        assertTrue(process.waitFor(5, TimeUnit.SECONDS), "Linux CPU script should finish promptly");
        String stdout = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        String stderr = new String(process.getErrorStream().readAllBytes(), StandardCharsets.UTF_8);
        return new ShellResult(process.exitValue(), stdout, stderr);
    }

    private record ShellResult(int exitCode, String stdout, String stderr) {
    }

    @Test
    void getAppDefineMetricNames() {
        assertDoesNotThrow(() -> appService.getAppDefineMetricNames("jvm"));
    }

    @Test
    void getI18nResources() {
        assertDoesNotThrow(() -> appService.getI18nResources("en-US"));
    }

    @Test
    void getAllAppHierarchy() {
        when(monitorDao.findMonitorsByAppEquals(anyString())).thenReturn(Collections
                .singletonList(Monitor.builder().id(1L).build()));
        when(warehouseService.queryMonitorMetricsData(anyLong())).thenReturn(Collections.emptyList());
        assertDoesNotThrow(() -> appService.getAllAppHierarchy("en-US"));
    }

    @Test
    void appDefineJexl() throws NoSuchMethodException {
        Job job = new Job();
        job.setApp("test-app");
        job.setCategory("service");
        job.setName(Map.of("k", "v"));

        List<RuntimeParamDefine> params = new ArrayList<>();
        RuntimeParamDefine hostParam = new RuntimeParamDefine();
        hostParam.setField("host");
        hostParam.setType("host");
        hostParam.setRequired(true);
        params.add(hostParam);

        RuntimeParamDefine portParam = new RuntimeParamDefine();
        portParam.setField("port");
        portParam.setType("number");
        portParam.setRequired(true);
        portParam.setDefaultValue("8080");
        params.add(portParam);

        job.setParams(params);

        List<Metrics> metrics = new ArrayList<>();

        Metrics otherMetrics = new Metrics();
        otherMetrics.setName("details");
        otherMetrics.setPriority((byte) 0);
        otherMetrics.setProtocol("http");

        List<Metrics.Field> fields = new ArrayList<>();
        fields.add(Metrics.Field.builder().field("size").build());
        otherMetrics.setFields(fields);

        metrics.add(otherMetrics);
        job.setMetrics(metrics);

        Method verifyMethod = AppServiceImpl.class.getDeclaredMethod("verifyDefineAppContent", Job.class, boolean.class);
        verifyMethod.setAccessible(true);
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            try {
                verifyMethod.invoke(appService, job, false);
            } catch (InvocationTargetException e) {
                if (e.getCause() instanceof RuntimeException) {
                    throw e.getCause();
                }
                throw new RuntimeException(e.getCause());
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });
        assertTrue(exception.getMessage().contains("prohibited keywords"));
    }

    @Test
    void testRefreshStore() throws Exception {
        List<Define> defines = new ArrayList<>();
        Define define = Define.builder()
                .app("mysql")
                .content("""
                        app: mysql
                        params:
                          - field: host_test
                            name:
                              en-US: Target Host
                            type: host
                            required: true""")
                .build();
        defines.add(define);

        when(defineDao.findAll()).thenReturn(defines);

        ObjectStoreDTO<Object> objectStoreDTO = new ObjectStoreDTO<>();
        objectStoreDTO.setType(ObjectStoreDTO.Type.DATABASE);
        ObjectStoreConfigChangeEvent objectStoreConfigChangeEvent = new ObjectStoreConfigChangeEvent(objectStoreDTO);
        appService.onObjectStoreConfigChange(objectStoreConfigChangeEvent);

        List<ParamDefineInfo> appParamDefines = appService.getAppParamDefines(define.getApp());
        assertNotNull(appParamDefines);
        assertTrue(appParamDefines.stream().anyMatch(t -> t.getField().equals("host_test")));
    }

    private ParamDefineInfo findParam(String app, String field) {
        return appService.getAppParamDefines(app).stream()
            .filter(param -> field.equals(param.getField()))
            .findFirst()
            .orElseThrow();
    }
}
