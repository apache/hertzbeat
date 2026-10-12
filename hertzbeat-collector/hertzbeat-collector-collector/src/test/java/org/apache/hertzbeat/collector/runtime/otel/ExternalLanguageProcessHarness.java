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

package org.apache.hertzbeat.collector.runtime.otel;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Owns temporary files and sanitized child processes for external-language interoperability tests.
 */
final class ExternalLanguageProcessHarness implements AutoCloseable {

    private static final Pattern SAFE_LABEL = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._-]{0,63}");
    private static final Pattern SENSITIVE_OUTPUT = Pattern.compile(
            "(?im)((?:authorization\\s*[:=]\\s*)?bearer|authorization|token|password|secret)"
                    + "(\\s*[:=]\\s*|\\s+)[^\\r\\n]*");
    private static final int MAX_SHORT_OUTPUT = 4_096;
    private static final int MAX_DIAGNOSTIC_OUTPUT = 4_096;

    private final Path root;
    private final Path home;
    private final Path temporary;
    private final Path logs;
    private final List<Process> processes = new ArrayList<>();

    private ExternalLanguageProcessHarness(Path root) throws IOException {
        this.root = root;
        home = Files.createDirectory(root.resolve("home"));
        temporary = Files.createDirectory(root.resolve("tmp"));
        logs = Files.createDirectory(root.resolve("logs"));
    }

    static ExternalLanguageProcessHarness create(String prefix) throws IOException {
        return new ExternalLanguageProcessHarness(Files.createTempDirectory(prefix));
    }

    Path resolve(String relative) {
        Path resolved = root.resolve(relative).normalize();
        if (!resolved.startsWith(root)) {
            throw new IllegalArgumentException("External-language fixture path escapes its temporary directory");
        }
        return resolved;
    }

    Path createPythonVirtualEnvironment(Path pythonBinary) throws Exception {
        Path virtualEnvironment = resolve("python-venv");
        run(
                List.of(pythonBinary.toString(), "-m", "venv", virtualEnvironment.toString()),
                Map.of(),
                Duration.ofMinutes(1),
                "python-venv");
        return virtualEnvironment;
    }

    Map<String, String> createGoEnvironment(Path goBinary) throws IOException {
        Path goRoot = Files.createDirectories(resolve("go"));
        Path goPath = Files.createDirectories(goRoot.resolve("gopath"));
        Path moduleCache = Files.createDirectories(goRoot.resolve("module-cache"));
        Path buildCache = Files.createDirectories(goRoot.resolve("build-cache"));
        return Map.of(
                "PATH", goBinary.getParent() + ":/usr/bin:/bin:/usr/sbin:/sbin",
                "GOENV", "off",
                "GOTOOLCHAIN", "local",
                "CGO_ENABLED", "0",
                "GOPATH", goPath.toString(),
                "GOMODCACHE", moduleCache.toString(),
                "GOCACHE", buildCache.toString());
    }

    Map<String, String> createDotnetEnvironment(Path dotnetBinary) throws IOException {
        Path dotnetRoot = dotnetBinary.getParent();
        Path cliHome = Files.createDirectories(resolve("dotnet-cli-home"));
        Path nugetPackages = Files.createDirectories(resolve("nuget-packages"));
        Path nugetHttpCache = Files.createDirectories(resolve("nuget-http-cache"));
        Path bundleExtract = Files.createDirectories(resolve("dotnet-bundle-extract"));
        return Map.ofEntries(
                Map.entry("PATH", dotnetRoot + ":/usr/bin:/bin:/usr/sbin:/sbin"),
                Map.entry("DOTNET_ROOT", dotnetRoot.toString()),
                Map.entry("DOTNET_CLI_HOME", cliHome.toString()),
                Map.entry("NUGET_PACKAGES", nugetPackages.toString()),
                Map.entry("NUGET_HTTP_CACHE_PATH", nugetHttpCache.toString()),
                Map.entry("DOTNET_BUNDLE_EXTRACT_BASE_DIR", bundleExtract.toString()),
                Map.entry("DOTNET_CLI_TELEMETRY_OPTOUT", "1"),
                Map.entry("DOTNET_SKIP_FIRST_TIME_EXPERIENCE", "1"),
                Map.entry("DOTNET_NOLOGO", "1"),
                Map.entry("DOTNET_MULTILEVEL_LOOKUP", "0"),
                Map.entry("DOTNET_ADD_GLOBAL_TOOLS_TO_PATH", "false"),
                Map.entry("DOTNET_GENERATE_ASPNET_CERTIFICATE", "false"));
    }

    Map<String, String> createDockerEnvironment(Path dockerBinary) throws IOException {
        Path dockerConfig = Files.createDirectories(resolve("docker-config"));
        Files.writeString(dockerConfig.resolve("config.json"), "{\"auths\":{}}\n");
        return Map.of(
                "PATH", dockerBinary.getParent() + ":/usr/bin:/bin:/usr/sbin:/sbin",
                "DOCKER_CONFIG", dockerConfig.toString());
    }

    Process start(List<String> command, Map<String, String> environment, String label) throws IOException {
        requireCommand(command);
        Path output = outputPath(label);
        ProcessBuilder builder = processBuilder(command, environment)
                .redirectErrorStream(true)
                .redirectOutput(ProcessBuilder.Redirect.appendTo(output.toFile()));
        Process process = builder.start();
        processes.add(process);
        return process;
    }

    Process startWithSecretInput(
            List<String> command,
            Map<String, String> environment,
            String label,
            char[] secretInput) throws IOException {
        if (secretInput == null || secretInput.length == 0) {
            throw new IllegalArgumentException("External process secret input is required");
        }
        try {
            if (command != null && command.stream().anyMatch(argument -> argument != null
                    && contains(argument, secretInput))) {
                throw new IllegalArgumentException("External process secret must not appear in command arguments");
            }
            Process process = start(command, environment, label);
            try (var writer = new java.io.OutputStreamWriter(process.getOutputStream(), StandardCharsets.UTF_8)) {
                writer.write(secretInput);
                writer.write('\n');
            }
            return process;
        } finally {
            Arrays.fill(secretInput, '\0');
        }
    }

    private boolean contains(String value, char[] candidate) {
        if (candidate.length > value.length()) {
            return false;
        }
        for (int offset = 0; offset <= value.length() - candidate.length; offset++) {
            int index = 0;
            while (index < candidate.length && value.charAt(offset + index) == candidate[index]) {
                index++;
            }
            if (index == candidate.length) {
                return true;
            }
        }
        return false;
    }

    void run(List<String> command, Map<String, String> environment, Duration timeout, String label) throws Exception {
        Process process = start(command, environment, label);
        if (!process.waitFor(timeout.toMillis(), java.util.concurrent.TimeUnit.MILLISECONDS)) {
            stop(process, Duration.ofSeconds(2));
            throw new IllegalStateException("External command exceeded its bounded timeout: " + label);
        }
        processes.remove(process);
        if (process.exitValue() != 0) {
            throw new IllegalStateException("External command failed with exit code "
                    + process.exitValue() + ": " + label + "; " + processDiagnostic(process, label));
        }
    }

    String capture(List<String> command, Map<String, String> environment, Duration timeout) throws Exception {
        requireCommand(command);
        Process process = processBuilder(command, environment).redirectErrorStream(true).start();
        processes.add(process);
        if (!process.waitFor(timeout.toMillis(), java.util.concurrent.TimeUnit.MILLISECONDS)) {
            stop(process, Duration.ofSeconds(2));
            throw new IllegalStateException("External short command exceeded its bounded timeout");
        }
        byte[] output = process.getInputStream().readAllBytes();
        processes.remove(process);
        if (output.length > MAX_SHORT_OUTPUT) {
            throw new IllegalStateException("External short command exceeded its output limit");
        }
        if (process.exitValue() != 0) {
            throw new IllegalStateException("External short command failed with exit code "
                    + process.exitValue() + "; output:\n" + sanitizeOutput(output));
        }
        return new String(output, StandardCharsets.UTF_8).trim();
    }

    void stop(Process process, Duration timeout) throws InterruptedException {
        if (process == null) {
            return;
        }
        List<ProcessHandle> descendants = process.descendants().toList();
        descendants.forEach(ProcessHandle::destroy);
        process.destroy();
        if (!process.waitFor(timeout.toMillis(), java.util.concurrent.TimeUnit.MILLISECONDS)) {
            descendants.forEach(ProcessHandle::destroyForcibly);
            process.destroyForcibly();
            process.waitFor(timeout.toMillis(), java.util.concurrent.TimeUnit.MILLISECONDS);
        }
        processes.remove(process);
    }

    String processDiagnostic(Process process, String label) throws IOException {
        String state = process.isAlive()
                ? "is still running"
                : "exited with code " + process.exitValue();
        Path output = diagnosticPath(label);
        if (!Files.isRegularFile(output) || Files.size(output) == 0) {
            return "external process " + state + "; recent output: <empty>";
        }
        long size = Files.size(output);
        byte[] tail;
        try (InputStream input = Files.newInputStream(output)) {
            input.skipNBytes(Math.max(0, size - MAX_DIAGNOSTIC_OUTPUT));
            tail = input.readNBytes(MAX_DIAGNOSTIC_OUTPUT);
        }
        return "external process " + state + "; recent output:\n" + sanitizeOutput(tail);
    }

    private ProcessBuilder processBuilder(List<String> command, Map<String, String> overrides) {
        ProcessBuilder builder = new ProcessBuilder(command).directory(root.toFile());
        Map<String, String> environment = builder.environment();
        environment.clear();
        environment.putAll(baseEnvironment());
        environment.putAll(overrides);
        return builder;
    }

    private Map<String, String> baseEnvironment() {
        Map<String, String> environment = new HashMap<>();
        environment.put("HOME", home.toString());
        environment.put("TMPDIR", temporary.toString());
        environment.put("PATH", "/usr/bin:/bin:/usr/sbin:/sbin");
        environment.put("LANG", "C.UTF-8");
        environment.put("NO_COLOR", "1");
        return environment;
    }

    private Path outputPath(String label) throws IOException {
        Path output = diagnosticPath(label);
        if (!Files.exists(output)) {
            Files.createFile(output);
        }
        return output;
    }

    private Path diagnosticPath(String label) {
        if (label == null || !SAFE_LABEL.matcher(label).matches()) {
            throw new IllegalArgumentException("External process label is invalid");
        }
        return logs.resolve(label + ".log");
    }

    private String sanitizeOutput(byte[] output) {
        String safeOutput = new String(output, StandardCharsets.UTF_8)
                .replaceAll("[\\p{Cc}&&[^\\r\\n\\t]]", "?");
        return SENSITIVE_OUTPUT.matcher(safeOutput).replaceAll("$1=<redacted>").strip();
    }

    private void requireCommand(List<String> command) {
        if (command == null || command.isEmpty() || command.stream().anyMatch(value -> value == null || value.isBlank())) {
            throw new IllegalArgumentException("External process command is invalid");
        }
    }

    @Override
    public void close() throws Exception {
        for (Process process : List.copyOf(processes).reversed()) {
            stop(process, Duration.ofSeconds(2));
        }
        try (var paths = Files.walk(root)) {
            List<Path> ownedPaths = paths.toList();
            for (Path path : ownedPaths) {
                path.toFile().setWritable(true);
            }
            for (Path path : ownedPaths.stream().sorted(Comparator.reverseOrder()).toList()) {
                Files.deleteIfExists(path);
            }
        }
    }
}
