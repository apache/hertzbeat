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
