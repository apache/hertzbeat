package org.dromara.hertzbeat.alert.service.impl;


import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.yaml.snakeyaml.DumperOptions;
import org.yaml.snakeyaml.Yaml;

import java.io.InputStream;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.List;


/**
 * Configure the import and export Yaml format
 * 配置导入导出 Yaml格式
 *
 * @author a-little-fool
 * Created by a-little-fool on 2023/12/25
 */
@Slf4j
@Service
public class AlertDefineYamlImExportServiceImpl extends AlertDefineAbstractImExportServiceImpl {

    public static final String TYPE = "YAML";
    public static final String FILE_SUFFIX = ".yaml";


    @Override
    public String type() {
        return TYPE;
    }

    @Override
    public String getFileName() {
        return fileNamePrefix() + FILE_SUFFIX;
    }

    @Override
    List<ExportAlertDefineDTO> parseImport(InputStream is) {
        Yaml yaml = new Yaml();
        return yaml.load(is);
    }

    @Override
    void writeOs(List<ExportAlertDefineDTO> exportAlertDefineList, OutputStream os) {
        DumperOptions options = new DumperOptions();
        options.setDefaultFlowStyle(DumperOptions.FlowStyle.BLOCK);
        options.setIndent(2);
        options.setPrettyFlow(true);
        Yaml yaml = new Yaml(options);
        yaml.dump(exportAlertDefineList, new OutputStreamWriter(os, StandardCharsets.UTF_8));
    }
}
