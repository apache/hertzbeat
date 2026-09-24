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

package org.apache.hertzbeat.manager.service.impl;

import static org.apache.hertzbeat.common.constants.ExportFileConstants.YamlFile.FILE_SUFFIX;
import static org.apache.hertzbeat.common.constants.ExportFileConstants.YamlFile.TYPE;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.stereotype.Service;
import org.apache.hertzbeat.common.util.export.YamlExportUtils;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.SafeConstructor;
import org.yaml.snakeyaml.error.YAMLException;
import org.yaml.snakeyaml.nodes.Tag;

/**
 * Configure the import and export Yaml format
 */
@Slf4j
@Service
public class YamlImExportServiceImpl extends AbstractImExportServiceImpl {

    private static final Set<Tag> LEGACY_TAGS = Set.of(
            new Tag(ExportMonitorDTO.class), new Tag(MonitorDTO.class), new Tag(ParamDTO.class));

    /**
     * Export file type
     * @return file type
     */
    @Override
    public String type() {
        return TYPE;
    }

    /**
     * Get Export File Name
     * @return file name
     */
    @Override
    public String getFileName() {
        return fileNamePrefix() + FILE_SUFFIX;
    }

    /**
     * Parsing an input stream into a form
     * @param is input stream
     * @return form
     */
    @Override
    public List<ExportMonitorDTO> parseImport(InputStream is) {
        LoaderOptions options = new LoaderOptions();
        options.setTagInspector(LEGACY_TAGS::contains);
        Object data;
        try {
            data = new Yaml(new MonitorYamlConstructor(options)).load(is);
        } catch (YAMLException e) {
            throw new IllegalArgumentException("Invalid YAML monitor configuration", e);
        }
        if (!(data instanceof List<?> entries) || entries.isEmpty()) {
            throw new IllegalArgumentException("YAML monitor configuration must be a non-empty list");
        }
        return entries.stream().map(entry -> {
            if (!(entry instanceof Map<?, ?>)) {
                throw new IllegalArgumentException("Each YAML monitor entry must be a mapping");
            }
            ExportMonitorDTO monitor = JsonUtil.convertValue(entry, ExportMonitorDTO.class);
            if (monitor == null || monitor.getMonitor() == null) {
                throw new IllegalArgumentException("Each YAML monitor entry must contain a valid monitor");
            }
            return monitor;
        }).toList();
    }

    /**
     * Export Configuration to Output Stream
     * @param monitorList configuration list
     * @param os          output stream
     */
    @Override
    public void writeOs(List<ExportMonitorDTO> monitorList, OutputStream os) {

        // Export plain mappings so the file does not depend on Java class names.
        YamlExportUtils.exportWriteOs(monitorList.stream()
                .map(monitor -> JsonUtil.convertValue(monitor, Map.class)).toList(), os);
    }

    private static final class MonitorYamlConstructor extends SafeConstructor {

        private MonitorYamlConstructor(LoaderOptions options) {
            super(options);
            // Older exports contain DTO tags. Read only these tags as maps, never as Java objects.
            LEGACY_TAGS.forEach(tag -> yamlConstructors.put(tag, new ConstructYamlMap()));
        }
    }
}
