package org.dromara.hertzbeat.manager.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.List;
/**
 * Configure the import and export Yaml format
 * 配置导入导出 Yaml格式
 *
 * @author <a href="mailto:zqr10159@126.com">zqr10159</a>
 * Created by zqr10159 on 2023/4/20
 */
@Slf4j
@Service
public class YamlImExportServiceImpl extends AbstractImExportServiceImpl{
    public static final String TYPE = "YAML";
    public static final String FILE_SUFFIX = ".yaml";
    @Resource
    @Qualifier("yamlMapper")
    private ObjectMapper objectMapper;

    private YamlImExportServiceImpl(ObjectMapper yamlMapper) {
        this.objectMapper = yamlMapper;
    }
    /**
     * Export file type
     * 导出文件类型
     *
     * @return 文件类型
     */
    @Override
    public String type() {
        return TYPE;
    }

    /**
     * Get Export File Name
     * 获取导出文件名
     *
     * @return 文件名
     */
    @Override
    public String getFileName() {
        return fileNamePrefix() + FILE_SUFFIX;
    }

    /**
     * Parsing an input stream into a form
     * 将输入流解析为表单
     *
     * @param is 输入流
     * @return 表单
     */
    @Override
    List<ExportMonitorDTO> parseImport(InputStream is) {
        try {
            YAMLMapper yamlMapper = new YAMLMapper();
            return objectMapper.readValue(is, new TypeReference<>() {
            });
        } catch (IOException ex) {
            log.error("import monitor failed.", ex);
            throw new RuntimeException("import monitor failed");
        }
    }

    /**
     * Export Configuration to Output Stream
     * 导出配置到输出流
     *
     * @param monitorList 配置列表
     * @param os          输出流
     */
    @Override
    void writeOs(List<ExportMonitorDTO> monitorList, OutputStream os) {
        try {
            YAMLMapper yamlMapper = new YAMLMapper();
            objectMapper.writeValue(os, monitorList);
        } catch (IOException ex) {
            log.error("export monitor failed.", ex);
            throw new RuntimeException("export monitor failed");
        }
    }
}
