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
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Launches the runtime directly without a shell or command interpolation.
 */
public class OtelRuntimeProcessLauncher {

    /**
     * Start a runtime or validation process.
     *
     * @return started child process
     * @throws IOException when the process cannot be started
     */
    public Process start(Path binary, Path config, Path workingDirectory, Path logFile,
                         Map<String, String> environment, boolean validate) throws IOException {
        Files.createDirectories(workingDirectory);
        Files.createDirectories(logFile.toAbsolutePath().normalize().getParent());
        return processBuilder(binary, config, workingDirectory, logFile, environment, validate).start();
    }

    ProcessBuilder processBuilder(Path binary, Path config, Path workingDirectory, Path logFile,
                                  Map<String, String> environment, boolean validate) {
        List<String> command = new ArrayList<>();
        command.add(binary.toAbsolutePath().normalize().toString());
        if (validate) {
            command.add("validate");
        }
        command.add("--config");
        command.add(config.toAbsolutePath().normalize().toString());
        ProcessBuilder builder = new ProcessBuilder(command);
        builder.directory(workingDirectory.toAbsolutePath().normalize().toFile());
        builder.redirectOutput(ProcessBuilder.Redirect.appendTo(logFile.toAbsolutePath().normalize().toFile()));
        builder.redirectError(ProcessBuilder.Redirect.appendTo(logFile.toAbsolutePath().normalize().toFile()));
        builder.environment().putAll(environment);
        return builder;
    }
}
