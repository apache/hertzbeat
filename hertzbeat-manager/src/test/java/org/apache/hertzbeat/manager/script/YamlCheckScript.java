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

import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.constants.JexlKeywordsEnum;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Stream;

/**
 * Yaml check script
 */
public class YamlCheckScript {

    static final String YML_PATH = "src/main/resources/define";

    @Test
    public void checkYaml() throws IOException {
        Path definePath = Paths.get(YML_PATH);
        if (!Files.exists(definePath)) {
            throw new IllegalStateException("Define directory not found: " + YML_PATH);
        }
        try (Stream<Path> paths = Files.walk(definePath)) {
            paths.filter(Files::isRegularFile)
                    .filter(path -> path.toString().endsWith(".yml"))
                    .forEach(this::validateYmlFile);
        }
    }

    private void validateYmlFile(Path filePath) {
        var yaml = new Yaml();
        Job app;
        try {
            app = yaml.loadAs(Files.readString(filePath), Job.class);
        } catch (Exception e) {
            throw new IllegalArgumentException("parse yml error in file " + filePath.getFileName() + ": " + e.getMessage());
        }
        if (app == null) {
            throw new IllegalArgumentException("Failed to load Job from file: " + filePath.getFileName());
        }
        try {
            validateJexlKeywords(app.getMetrics());
        } catch (Exception e) {
            System.out.printf("file: %s , msg: %s%n", filePath.getFileName(), e.getMessage());
        }
    }

    private void validateJexlKeywords(List<Metrics> metrics) {
        if (null == metrics || metrics.isEmpty()) {
            return;
        }
        for (Metrics metric : metrics) {
            if (null == metric.getFields() || metric.getFields().isEmpty()) {
                continue;
            }
            for (Metrics.Field field : metric.getFields()) {
                if (null == field || StringUtils.isBlank(field.getField())) {
                    continue;
                }
                if (JexlKeywordsEnum.match(field.getField())) {
                    throw new IllegalArgumentException("check jexl keywords failed. field:" + field.getField());
                }
            }
        }

    }
}