package org.dromara.hertzbeat.manager.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.dromara.hertzbeat.manager.dao.GeneralConfigDao;
import org.dromara.hertzbeat.manager.pojo.dto.NoticeSender;
import org.springframework.stereotype.Service;

import java.lang.reflect.Type;


@Service
public class MailGeneralConfigServiceImpl extends AbstractGeneralConfigServiceImpl<NoticeSender> {
    public MailGeneralConfigServiceImpl(GeneralConfigDao generalConfigDao, ObjectMapper objectMapper) {
        super(generalConfigDao, objectMapper, (byte) 2);
    }

    @Override
    public void saveConfig(NoticeSender config, boolean enabled) {
        super.saveConfig(config, config.isEmailEnable());
    }

    @Override
    protected TypeReference<NoticeSender> getTypeReference() {
        return new TypeReference<>() {
            @Override
            public Type getType() {
                return NoticeSender.class;
            }
        };
    }
}
