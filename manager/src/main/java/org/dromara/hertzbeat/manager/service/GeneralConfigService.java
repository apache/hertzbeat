package org.dromara.hertzbeat.manager.service;

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
     * config type: email, sms
     * @return type string
     */
    String type();
    
    /**
     * 保存更新配置
     *
     * @param config 需要保存的配置
     */
    void saveConfig(T config);

    /**
     * 获取配置
     *
     * @return 查询到的配置
     */
    T getConfig();
    
    /**
     * handler after save config
     * @param config config
     */
    default void handler(T config) {}
}
