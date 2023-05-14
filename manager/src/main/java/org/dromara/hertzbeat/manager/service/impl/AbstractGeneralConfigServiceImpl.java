package org.dromara.hertzbeat.manager.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.manager.GeneralConfig;
import org.dromara.hertzbeat.manager.dao.GeneralConfigDao;
import org.dromara.hertzbeat.manager.service.GeneralConfigService;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * 提供通用配置Service的抽象实现，实现了增删查改等操作。
 *
 * <p>Abstract implementation of GeneralConfigService, providing CRUD operations for configurations.</p>
 * @author zqr10159
 * @param <T> 配置类型
 * @version 1.0
 */
@Slf4j
abstract class AbstractGeneralConfigServiceImpl<T> implements GeneralConfigService<T> {
    protected final GeneralConfigDao generalConfigDao;
    protected final ObjectMapper objectMapper;
    protected Byte type;
    protected boolean enabled;

    /**
     * 构造方法，传入GeneralConfigDao、ObjectMapper和type。
     *
     * <p>Constructor, passing in GeneralConfigDao, ObjectMapper and type.</p>
     *
     * @param generalConfigDao 配置Dao对象
     * @param objectMapper JSON工具类对象
     * @param type 配置类型
     */
    protected AbstractGeneralConfigServiceImpl(GeneralConfigDao generalConfigDao, ObjectMapper objectMapper, Byte type) {
        this.generalConfigDao = generalConfigDao;
        this.objectMapper = objectMapper;
        this.type = type;
    }

    /**
     * 保存配置。
     *
     * <p>Save a configuration.</p>
     *
     * @param config 需要保存的配置对象
     * @param enabled 是否启用
     */
    @Transactional(rollbackFor = Exception.class)
    @Override
    public void saveConfig(T config, boolean enabled) {
        try {
            String contentJson = objectMapper.writeValueAsString(config);

            GeneralConfig generalConfig2Save = GeneralConfig.builder()
                    .type(type)
                    .enabled(enabled)
                    .content(contentJson)
                    .build();
            generalConfigDao.save(generalConfig2Save);
            log.info("配置保存成功|Configuration saved successfully");
        } catch (JsonProcessingException e) {
            throw new RuntimeException("配置保存失败|Configuration saved failed");
        }
    }

    /**
     * 删除配置。
     *
     * <p>Delete a configuration.</p>
     */
    @Transactional(rollbackFor = Exception.class)
    @Override
    public void deleteConfig() {
        int count = generalConfigDao.deleteByType(type);
        if (count == 0) {
            throw new RuntimeException(("配置已被删除，无法再次被删除|Configuration has been deleted and cannot be deleted again"));
        }
        if (count > 1) {
            log.warn("配置项有多个，{}个配置项被删除|Configuration has multiple items and {} items were deleted", count, count);
        }
        log.info("配置项删除成功|Configuration deleted successfully");
    }

    /**
     * 获取配置。
     *
     * <p>Get a configuration.</p>
     *
     * @return 查询到的配置对象
     */
    @Override
    public T getConfig() {
        GeneralConfig generalConfig = generalConfigDao.findByType(type);
        if (generalConfig == null) {
            return null;
        }
        try {
            return objectMapper.readValue(generalConfig.getContent(), getTypeReference());
        } catch (JsonProcessingException e) {
            throw new RuntimeException("获取配置失败|Get configuration failed");
        }
    }

    /**
     * 获取所有配置。
     *
     * <p>Get all configurations.</p>
     *
     * @return 查询到的所有配置对象集合
     */
    @Override
    public List<T> getConfigs() {
        List<GeneralConfig> configs = generalConfigDao.findAll();
        List<T> result = new ArrayList<>();
        for (GeneralConfig config : configs) {
            try {
                T t = objectMapper.readValue(config.getContent(), getTypeReference());
                result.add(t);
            } catch (JsonProcessingException e) {
                throw new RuntimeException("获取配置失败|Get configuration failed");
            }
        }
        return result;
    }

    /**
     * 获取配置类型的TypeReference对象。
     *
     * <p>Get TypeReference object of configuration type.</p>
     *
     * @return 配置类型的TypeReference对象
     */
    protected abstract TypeReference<T> getTypeReference();

}