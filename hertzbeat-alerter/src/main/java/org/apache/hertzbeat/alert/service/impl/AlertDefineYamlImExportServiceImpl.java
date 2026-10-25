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

package org.apache.hertzbeat.alert.service.impl;

import static org.apache.hertzbeat.common.constants.ExportFileConstants.YamlFile.FILE_SUFFIX;
import static org.apache.hertzbeat.common.constants.ExportFileConstants.YamlFile.TYPE;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.dto.AlertDefineDTO;
import org.apache.hertzbeat.alert.dto.ExportAlertDefineDTO;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.stereotype.Service;
import org.apache.hertzbeat.common.util.export.YamlExportUtils;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.SafeConstructor;
import org.yaml.snakeyaml.error.YAMLException;
import org.yaml.snakeyaml.nodes.Node;
import org.yaml.snakeyaml.nodes.NodeId;
import org.yaml.snakeyaml.nodes.Tag;

/**
 * Configure the import and export Yaml format.
 */

@Slf4j
@Service
public class AlertDefineYamlImExportServiceImpl extends AlertDefineAbstractImExportServiceImpl {

    private static final Set<Tag> LEGACY_TAGS = Set.of(
            new Tag(ExportAlertDefineDTO.class), new Tag(AlertDefineDTO.class));

    @Override
    public String type() {
        return TYPE;
    }

    @Override
    public String getFileName() {
        return fileNamePrefix() + FILE_SUFFIX;
    }

    @Override
    public List<ExportAlertDefineDTO> parseImport(InputStream is) {
        LoaderOptions options = new LoaderOptions();
        options.setTagInspector(LEGACY_TAGS::contains);
        Object data;
        try {
            data = new Yaml(new AlertDefineYamlConstructor(options)).load(is);
        } catch (YAMLException e) {
            throw new IllegalArgumentException("Invalid YAML alert definition configuration", e);
        }
        if (!(data instanceof List<?> entries) || entries.isEmpty()) {
            throw new IllegalArgumentException("YAML alert definition configuration must be a non-empty list");
        }
        return entries.stream().map(entry -> {
            if (!(entry instanceof Map<?, ?>)) {
                throw new IllegalArgumentException("Each YAML alert definition entry must be a mapping");
            }
            ExportAlertDefineDTO define = JsonUtil.convertValue(entry, ExportAlertDefineDTO.class);
            if (define == null || define.getAlertDefine() == null) {
                throw new IllegalArgumentException("Each YAML entry must contain a valid alert definition");
            }
            return define;
        }).toList();
    }

    @Override
    public void writeOs(List<ExportAlertDefineDTO> exportAlertDefineList, OutputStream os) {

        // Export data mappings, without Java DTO tags, as for monitor YAML exports.
        YamlExportUtils.exportWriteOs(exportAlertDefineList.stream()
                .map(define -> JsonUtil.convertValue(define, Map.class)).toList(), os);
    }

    private static final class AlertDefineYamlConstructor extends SafeConstructor {

        private AlertDefineYamlConstructor(LoaderOptions options) {
            super(options);
            // Accept only legacy DTO tags, as mappings; never construct arbitrary Java objects.
            LEGACY_TAGS.forEach(tag -> yamlConstructors.put(tag, new ConstructYamlMap() {
                @Override
                public Object construct(Node node) {
                    if (node.getNodeId() != NodeId.mapping) {
                        throw new YAMLException("Legacy alert definition DTO tags require a mapping");
                    }
                    return super.construct(node);
                }
            }));
        }
    }
}
