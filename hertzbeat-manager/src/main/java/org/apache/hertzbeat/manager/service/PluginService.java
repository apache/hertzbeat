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

package org.apache.hertzbeat.manager.service;

import java.util.List;
import java.util.Set;
import java.util.function.BiConsumer;
import java.util.function.Consumer;
import org.apache.hertzbeat.common.entity.dto.PluginUpload;
import org.apache.hertzbeat.common.entity.manager.PluginMetadata;
import org.apache.hertzbeat.common.entity.plugin.PluginContext;
import org.apache.hertzbeat.manager.pojo.dto.PluginParam;
import org.apache.hertzbeat.manager.pojo.dto.PluginParametersVO;
import org.springframework.data.domain.Page;

/**
 * plugin service
 */
public interface PluginService {

    /**
     * save plugin
     */
    void savePlugin(PluginUpload pluginUpload);

    /**
     * Determine whether the plugin is enabled
     *
     * @param clazz plugin Class
     * @return return true if enabled
     */
    boolean pluginIsEnable(Class<?> clazz);


    /**
     * get plugin page list
     *
     * @param search        plugin name search
     * @param pageIndex     List current page
     * @param pageSize      Number of list pagination
     * @return Plugins
     */
    Page<PluginMetadata> getPlugins(String search, int pageIndex, int pageSize);

    /**
     * execute plugin
     * @param clazz plugin interface
     * @param execute run plugin logic
     * @param <T> plugin type
     */
    <T> void pluginExecute(Class<T> clazz, Consumer<T> execute);


    /**
     * execute plugin
     *
     * @param clazz   plugin interface
     * @param execute run plugin logic
     * @param <T>     plugin type
     */
    <T> void pluginExecute(Class<T> clazz, BiConsumer<T, PluginContext> execute);


    /**
     * delete plugin
     *
     * @param ids set of plugin id
     */
    void deletePlugins(Set<Long> ids);

    void updateStatus(PluginMetadata plugin);

    /**
     * get param define
     * @param pluginMetadataId plugin id
     */
    PluginParametersVO getParamDefine(Long pluginMetadataId);

    /**
     * save plugin param
     * @param params params
     */
    void savePluginParam(List<PluginParam> params);

}
