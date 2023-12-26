package org.dromara.hertzbeat.alert.service;

import java.io.InputStream;
import java.io.OutputStream;
import java.util.List;


/**
 * Configuration Import Export
 * 配置导入导出
 *
 * @author a-little-fool
 * Created by a-little-fool on 2023/12/25
 */
public interface AlertDefineImExportService {
    /**
     * Import Configuration
     * 导入配置
     *
     * @param is 输入流
     */
    void importConfig(InputStream is);

    /**
     * Export Configuration
     * 导出配置
     *
     * @param os         输出流
     * @param configList 配置列表
     */
    void exportConfig(OutputStream os, List<Long> configList);

    /**
     * Export file type
     * 导出文件类型
     *
     * @return 文件类型
     */
    String type();

    /**
     * Get Export File Name
     * 获取导出文件名
     *
     * @return 文件名
     */
    String getFileName();
}
