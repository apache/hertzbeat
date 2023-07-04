package org.dromara.hertzbeat.manager.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.dromara.hertzbeat.manager.dao.GeneralConfigDao;
import org.dromara.hertzbeat.manager.pojo.dto.SystemConfig;
import org.springframework.stereotype.Service;

import java.lang.reflect.Type;

/**
 * @author ceilzcx
 * @since 4/7/2023
 */
@Service
public class SystemGeneralConfigServiceImpl extends AbstractGeneralConfigServiceImpl<SystemConfig> {

    /**
     * 构造方法，传入GeneralConfigDao、ObjectMapper和type。
     *
     * <p>Constructor, passing in GeneralConfigDao, ObjectMapper and type.</p>
     *
     * @param generalConfigDao 配置Dao对象
     * @param objectMapper     JSON工具类对象
     */
    protected SystemGeneralConfigServiceImpl(GeneralConfigDao generalConfigDao, ObjectMapper objectMapper) {
        super(generalConfigDao, objectMapper);
    }

    @Override
    public String type() {
        return "system";
    }

    /**
     * 该方法用于获取NoticeSender类型的TypeReference，以供后续处理。
     * This method is used to get the TypeReference of NoticeSender type for subsequent processing.
     *
     * @return NoticeSender类型的TypeReference
     * a TypeReference of NoticeSender type
     */
    @Override
    protected TypeReference<SystemConfig> getTypeReference() {
        return new TypeReference<>() {
            @Override
            public Type getType() {
                return SystemConfig.class;
            }
        };
    }
}
