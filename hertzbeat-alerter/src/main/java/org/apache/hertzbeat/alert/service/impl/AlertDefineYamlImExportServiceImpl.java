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
import org.apache.hertzbeat.common.util.export.YamlExportUtils;
import org.springframework.stereotype.Service;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.SafeConstructor;
import org.yaml.snakeyaml.nodes.Tag;

/**
 * Configure the import and export Yaml format.
 */

@Slf4j
@Service
public class AlertDefineYamlImExportServiceImpl extends AlertDefineAbstractImExportServiceImpl {

    private static final int MAX_CODE_POINTS = 1_048_576;
    private static final int MAX_NESTING_DEPTH = 50;
    private static final int MAX_ALIASES_FOR_COLLECTIONS = 20;
    private static final Tag LEGACY_EXPORT_ALERT_DEFINE_TAG = new Tag(ExportAlertDefineDTO.class);
    private static final Tag LEGACY_ALERT_DEFINE_TAG = new Tag(AlertDefineDTO.class);
    private static final Set<Tag> ALLOWED_LEGACY_TAGS =
            Set.of(LEGACY_EXPORT_ALERT_DEFINE_TAG, LEGACY_ALERT_DEFINE_TAG);

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
        LoaderOptions loaderOptions = new LoaderOptions();
        loaderOptions.setCodePointLimit(MAX_CODE_POINTS);
        loaderOptions.setNestingDepthLimit(MAX_NESTING_DEPTH);
        loaderOptions.setMaxAliasesForCollections(MAX_ALIASES_FOR_COLLECTIONS);
        loaderOptions.setTagInspector(ALLOWED_LEGACY_TAGS::contains);
        Yaml yaml = new Yaml(new LegacyAlertDefineSafeConstructor(loaderOptions));
        Object payload = yaml.load(is);
        if (!(payload instanceof List<?> records)) {
            throw new IllegalArgumentException("Alert define YAML must contain a list");
        }
        return records.stream().map(AlertDefineYamlImExportServiceImpl::toExportAlertDefine).toList();
    }

    @Override
    public void writeOs(List<ExportAlertDefineDTO> exportAlertDefineList, OutputStream os) {
        List<Object> portableRecords = exportAlertDefineList.stream()
                .map(AlertDefineYamlImExportServiceImpl::toPortableRecord)
                .toList();
        YamlExportUtils.exportWriteOs(portableRecords, os);
    }

    private static Object toPortableRecord(ExportAlertDefineDTO record) {
        Map<?, ?> portableRecord = JsonUtil.convertValueQuietly(record, Map.class);
        if (portableRecord == null) {
            throw new IllegalArgumentException("Alert define YAML contains an invalid export record");
        }
        return portableRecord;
    }

    private static ExportAlertDefineDTO toExportAlertDefine(Object record) {
        ExportAlertDefineDTO alertDefine = JsonUtil.convertValueQuietly(record, ExportAlertDefineDTO.class);
        if (alertDefine == null || alertDefine.getAlertDefine() == null) {
            throw new IllegalArgumentException("Alert define YAML contains an invalid record");
        }
        return alertDefine;
    }

    private static final class LegacyAlertDefineSafeConstructor extends SafeConstructor {

        private LegacyAlertDefineSafeConstructor(LoaderOptions loaderOptions) {
            super(loaderOptions);
            yamlConstructors.put(LEGACY_EXPORT_ALERT_DEFINE_TAG, new ConstructYamlMap());
            yamlConstructors.put(LEGACY_ALERT_DEFINE_TAG, new ConstructYamlMap());
        }
    }

}
