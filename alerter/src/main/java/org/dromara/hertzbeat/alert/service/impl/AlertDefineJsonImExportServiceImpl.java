package org.dromara.hertzbeat.alert.service.impl;


import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.List;


/**
 * Configure the import and export JSON format
 * 配置导入导出 JSON格式
 *
 * @author a-little-fool
 * Created by a-little-fool on 2023/12/25
 */
@Slf4j
@RequiredArgsConstructor
@Service
public class AlertDefineJsonImExportServiceImpl extends AlertDefineAbstractImExportServiceImpl {
    public static final String TYPE = "JSON";
    public static final String FILE_SUFFIX = ".json";

    private final ObjectMapper objectMapper;

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
        try {
            return objectMapper.readValue(is, new TypeReference<>() {
            });
        } catch (IOException ex) {
            log.error("import alertDefine failed.", ex);
            throw new RuntimeException("import alertDefine failed");
        }
    }

    @Override
    void writeOs(List<ExportAlertDefineDTO> exportAlertDefineList, OutputStream os) {
        try {
            objectMapper.writeValue(os, exportAlertDefineList);
        } catch (IOException ex) {
            log.error("export alertDefine failed.", ex);
            throw new RuntimeException("export alertDefine failed");
        }
    }
}
