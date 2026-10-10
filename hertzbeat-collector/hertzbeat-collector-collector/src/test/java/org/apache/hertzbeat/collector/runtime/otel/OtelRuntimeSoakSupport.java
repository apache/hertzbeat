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
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/** Process and idle helpers used only by the opt-in long-running soak. */
final class OtelRuntimeSoakSupport {

    private OtelRuntimeSoakSupport() {
    }

    static OtelRuntimeSupervisor supervisorWithDiscardedLogs(OtelRuntimeProperties properties) {
        return new OtelRuntimeSupervisor(
                properties,
                new OtelRuntimeBinaryResolver(properties),
                new OtelRuntimeConfigTransaction(new OtelRuntimeConfigRenderer()),
                new DiscardingProcessLauncher(),
                new OtelRuntimeHealthClient());
    }

    static void awaitBackendIdle(OtelRuntimeFaultBackend backend, Duration timeout) throws InterruptedException {
        OtelRuntimeFaultLoadSupport.await(
                () -> backend.activeWorkerCount() == 0 && backend.currentTaskQueueDepth() == 0,
                timeout);
    }

    static Long cpuMillis(long pid) {
        try {
            Process process = new ProcessBuilder("ps", "-o", "time=", "-p", Long.toString(pid)).start();
            if (!process.waitFor(2, TimeUnit.SECONDS) || process.exitValue() != 0) {
                process.destroyForcibly();
                return null;
            }
            return parseCpuTime(new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8));
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            return null;
        } catch (IOException ignored) {
            return null;
        }
    }

    static Long parseCpuTime(String rawValue) {
        if (rawValue == null) {
            return null;
        }
        String value = rawValue.trim();
        if (value.isEmpty()) {
            return null;
        }
        try {
            long days = 0;
            int dash = value.indexOf('-');
            if (dash >= 0) {
                if (dash != value.lastIndexOf('-')) {
                    return null;
                }
                days = Long.parseLong(value.substring(0, dash));
                value = value.substring(dash + 1);
            }
            String[] fields = value.split(":", -1);
            if (fields.length != 2 && fields.length != 3) {
                return null;
            }
            long hours = fields.length == 3 ? Long.parseLong(fields[0]) : 0;
            long minutes = Long.parseLong(fields[fields.length - 2]);
            if (fields.length == 3 && minutes > 59) {
                return null;
            }
            String[] secondFields = fields[fields.length - 1].split("\\.", -1);
            if (secondFields.length > 2 || secondFields[0].length() != 2) {
                return null;
            }
            long seconds = Long.parseLong(secondFields[0]);
            if (seconds > 59) {
                return null;
            }
            int fractionMillis = fractionMillis(secondFields);
            long totalHours = Math.addExact(Math.multiplyExact(days, 24), hours);
            long totalMinutes = Math.addExact(Math.multiplyExact(totalHours, 60), minutes);
            long totalSeconds = Math.addExact(Math.multiplyExact(totalMinutes, 60), seconds);
            return Math.addExact(Math.multiplyExact(totalSeconds, 1000), fractionMillis);
        } catch (NumberFormatException | ArithmeticException invalid) {
            return null;
        }
    }

    private static int fractionMillis(String[] secondFields) {
        if (secondFields.length == 1) {
            return 0;
        }
        String fraction = secondFields[1];
        if (fraction.isEmpty() || fraction.length() > 3) {
            throw new NumberFormatException("invalid fractional seconds");
        }
        return Integer.parseInt(fraction) * switch (fraction.length()) {
            case 1 -> 100;
            case 2 -> 10;
            default -> 1;
        };
    }

    private static final class DiscardingProcessLauncher extends OtelRuntimeProcessLauncher {

        @Override
        public Process start(
                Path binary,
                Path config,
                Path workingDirectory,
                Path logFile,
                Map<String, String> environment,
                boolean validate) throws IOException {
            Files.createDirectories(workingDirectory);
            ProcessBuilder builder = processBuilder(
                    binary, config, workingDirectory, logFile, environment, validate);
            builder.redirectOutput(ProcessBuilder.Redirect.DISCARD);
            builder.redirectError(ProcessBuilder.Redirect.DISCARD);
            return builder.start();
        }
    }
}
