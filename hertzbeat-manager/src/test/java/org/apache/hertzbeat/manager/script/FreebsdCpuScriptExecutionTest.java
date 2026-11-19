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

package org.apache.hertzbeat.manager.script;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledOnOs;
import org.junit.jupiter.api.condition.OS;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.yaml.snakeyaml.Yaml;

/**
 * Execution regression for the FreeBSD CPU idle suffix.
 *
 * <p>{@code SshCollectImpl} sends the template script to the remote account's configured
 * shell. Bourne-style assignments in that suffix fail under tcsh, so the fragment must run
 * inside an explicit POSIX shell.
 */
@EnabledOnOs({OS.LINUX, OS.MAC})
class FreebsdCpuScriptExecutionTest {

    private static final String CPU_SCRIPT_MARKER = "vmstat 1 1 | awk 'NR==3{print $12}'";
    private static final double EXPECTED_IDLE_PERCENT = 50.52;

    static Stream<String> loginShells() {
        List<String> shells = new ArrayList<>();
        shells.add("/bin/sh");
        for (String tcsh : List.of("/bin/tcsh", "/usr/bin/tcsh")) {
            if (Files.isExecutable(Path.of(tcsh))) {
                shells.add(tcsh);
                break;
            }
        }
        return shells.stream();
    }

    @Test
    void cpuIdleSuffixRunsInExplicitPosixShell() throws Exception {
        String suffix = cpuIdleSuffix();
        assertTrue(suffix.startsWith("sh -c "),
                "FreeBSD CPU idle sampling must be executed in an explicit POSIX shell");
        assertFalse(suffix.matches("(?s)^idle[12]=.*"),
                "login-shell-visible suffix must not start with a Bourne assignment");
    }

    @ParameterizedTest
    @MethodSource("loginShells")
    void cpuIdleSuffixExecutesUnderLoginShell(String shell) throws Exception {
        assumeTrue(Files.isExecutable(Path.of(shell)), "login shell is not available: " + shell);
        String suffix = cpuIdleSuffix();
        Path workDir = Files.createTempDirectory("freebsd-cpu-script-");
        try {
            installMockSysctl(workDir);
            ProcessBuilder processBuilder = new ProcessBuilder(shell, "-c", suffix);
            processBuilder.directory(workDir.toFile());
            processBuilder.redirectErrorStream(true);
            String path = System.getenv("PATH");
            processBuilder.environment().put("PATH",
                    workDir + File.pathSeparator + (path == null ? "" : path));
            Process process = processBuilder.start();
            String output;
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                output = reader.lines().reduce((first, second) -> second).orElse("").trim();
            }
            assertTrue(process.waitFor(15, TimeUnit.SECONDS), "cpu idle suffix timed out under " + shell);
            assertEquals(0, process.exitValue(),
                    "cpu idle suffix failed under " + shell + " with output: " + output);
            assertEquals(EXPECTED_IDLE_PERCENT, Double.parseDouble(output), 0.001);
        } finally {
            try (Stream<Path> paths = Files.walk(workDir)) {
                paths.sorted(Comparator.reverseOrder()).forEach(path -> path.toFile().delete());
            }
        }
    }

    private static String cpuIdleSuffix() throws Exception {
        Job app;
        try (InputStream inputStream = FreebsdCpuScriptExecutionTest.class
                .getClassLoader()
                .getResourceAsStream("define/app-freebsd.yml")) {
            if (inputStream == null) {
                throw new IllegalStateException("define/app-freebsd.yml not found on classpath");
            }
            app = new Yaml().loadAs(inputStream, Job.class);
        }
        Metrics cpu = app.getMetrics().stream()
                .filter(metrics -> "cpu".equals(metrics.getName()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("freebsd cpu metrics not found"));
        String script = cpu.getSsh().getScript();
        int marker = script.indexOf(CPU_SCRIPT_MARKER);
        assertTrue(marker >= 0, "freebsd cpu script missing vmstat marker");
        String suffix = script.substring(marker + CPU_SCRIPT_MARKER.length());
        if (suffix.startsWith(";")) {
            suffix = suffix.substring(1);
        }
        return suffix;
    }

    private static void installMockSysctl(Path workDir) throws Exception {
        Path sysctl = workDir.resolve("sysctl");
        // 100 0 0 0 400 then 148 0 0 0 449 -> idle 50.52
        Files.writeString(sysctl, """
                #!/bin/sh
                countfile="${0}.count"
                if [ "$1" = "-n" ] && [ "$2" = "kern.cp_time" ]; then
                  if [ ! -f "$countfile" ]; then
                    echo "100 0 0 0 400"
                    echo 1 > "$countfile"
                  else
                    echo "148 0 0 0 449"
                  fi
                  exit 0
                fi
                echo "unexpected: $*" >&2
                exit 1
                """, StandardCharsets.UTF_8);
        sysctl.toFile().setExecutable(true);
    }
}
