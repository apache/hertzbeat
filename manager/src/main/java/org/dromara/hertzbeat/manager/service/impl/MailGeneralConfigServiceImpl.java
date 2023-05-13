package org.dromara.hertzbeat.manager.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.dromara.hertzbeat.manager.dao.GeneralConfigDao;
import org.dromara.hertzbeat.manager.pojo.dto.MailConfig;
import org.springframework.stereotype.Service;

import java.lang.reflect.Type;


@Service
public class MailGeneralConfigServiceImpl extends AbstractGeneralConfigServiceImpl<MailConfig> {
    public MailGeneralConfigServiceImpl(GeneralConfigDao generalConfigDao, ObjectMapper objectMapper) {
        super(generalConfigDao, objectMapper, (byte) 2);
    }

    @Override
    public void saveConfig(MailConfig config, boolean enabled) {
        super.saveConfig(config, config.isEnabled());
    }

    @Override
    protected TypeReference<MailConfig> getTypeReference() {
        return new TypeReference<>() {
            @Override
            public Type getType() {
                return MailConfig.class;
            }
        };
    }
}
