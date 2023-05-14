package org.dromara.hertzbeat.manager.service;

import java.util.List;

/**
 * ConfigService接口，提供配置的增删查改操作
 * ConfigService interface provides CRUD operations for configurations.
 */
public interface GeneralConfigService<T> {

    /*
     * 保存配置
     * Save a configuration.
     */

    void saveConfig(T config, boolean enabled);

    /*
     * 删除配置
     * Delete a configuration.
     */
    void deleteConfig();

    /*
     * 获取配置
     * Get a configuration.
     */
    T getConfig();
    /*
     * 获取所有配置
     * Get all configurations.
     */
    List<T> getConfigs();
}