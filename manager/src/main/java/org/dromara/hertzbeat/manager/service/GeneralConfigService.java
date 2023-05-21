package org.dromara.hertzbeat.manager.service;

import java.util.List;

/**
 * ConfigService接口，提供配置的增删查改操作。
 *
 * <p>ConfigService interface provides CRUD operations for configurations.</p>
 * @author zqr10159
 * @param <T> 配置类型
 * @version 1.0
 */
public interface GeneralConfigService<T> {

    /**
     * 保存配置。
     *
     * @param config 需要保存的配置
     * @param enabled 是否启用
     */
    void saveConfig(T config, boolean enabled);

    /**
     * 删除配置。
     */
    void deleteConfig();

    /**
     * 获取配置。
     *
     * @return 查询到的配置
     */
    T getConfig();

    /**
     * 获取所有配置。
     *
     * @return 查询到的所有配置集合
     */
    List<T> getConfigs();
}