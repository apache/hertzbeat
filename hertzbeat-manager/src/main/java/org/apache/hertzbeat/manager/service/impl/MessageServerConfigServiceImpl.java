/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.service.impl;

import java.util.UUID;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.constants.GeneralConfigTypeEnum;
import org.apache.hertzbeat.common.entity.dto.MailServerConfig;
import org.apache.hertzbeat.common.entity.dto.sms.SmsConfig;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.EmailServerConfigRequest;
import org.apache.hertzbeat.manager.pojo.dto.EmailServerConfigResponse;
import org.apache.hertzbeat.manager.pojo.dto.MessageServerConfigResult;
import org.apache.hertzbeat.manager.pojo.dto.SmsServerConfigRequest;
import org.apache.hertzbeat.manager.pojo.dto.SmsServerConfigResponse;
import org.apache.hertzbeat.manager.service.ConfigService;
import org.apache.hertzbeat.manager.service.MessageServerConfigConflictException;
import org.apache.hertzbeat.manager.service.MessageServerConfigMapper;
import org.apache.hertzbeat.manager.service.MessageServerConfigRevisionRequiredException;
import org.apache.hertzbeat.manager.service.MessageServerConfigService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;

/** Coordinates safe mapping and atomic persistence for message-server configuration. */
@Service
public class MessageServerConfigServiceImpl implements MessageServerConfigService {

    private static final String MISSING_REVISION = "missing";

    private final ConfigService configService;
    private final MessageServerConfigMapper mapper;
    private final GeneralConfigDao generalConfigDao;

    public MessageServerConfigServiceImpl(ConfigService configService, MessageServerConfigMapper mapper,
                                          GeneralConfigDao generalConfigDao) {
        this.configService = configService;
        this.mapper = mapper;
        this.generalConfigDao = generalConfigDao;
    }

    @Override
    public MessageServerConfigResult<EmailServerConfigResponse> getEmailConfig() {
        GeneralConfig stored = generalConfigDao.findByType(GeneralConfigTypeEnum.email.name());
        if (stored == null) {
            return MessageServerConfigResult.missing();
        }
        MailServerConfig config = read(stored, new TypeReference<>() { });
        return MessageServerConfigResult.configured(stored.getRevision(), mapper.toEmailResponse(config));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MessageServerConfigResult<EmailServerConfigResponse> saveEmailConfig(EmailServerConfigRequest request) {
        requireExpectedRevision(request.getExpectedRevision());
        String type = GeneralConfigTypeEnum.email.name();
        GeneralConfig stored = generalConfigDao.findByType(type);
        MailServerConfig existing = stored == null ? null : read(stored, new TypeReference<>() { });
        MailServerConfig merged = mapper.toEmailConfig(request, existing);
        String revision = persist(type, request.getExpectedRevision(), stored, merged);
        configService.handleConfig(type, merged);
        return MessageServerConfigResult.configured(revision, mapper.toEmailResponse(merged));
    }

    @Override
    public MessageServerConfigResult<SmsServerConfigResponse> getSmsConfig() {
        GeneralConfig stored = generalConfigDao.findByType(GeneralConfigTypeEnum.sms.name());
        if (stored == null) {
            return MessageServerConfigResult.missing();
        }
        SmsConfig config = read(stored, new TypeReference<>() { });
        return MessageServerConfigResult.configured(stored.getRevision(), mapper.toSmsResponse(config));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MessageServerConfigResult<SmsServerConfigResponse> saveSmsConfig(SmsServerConfigRequest request) {
        requireExpectedRevision(request.getExpectedRevision());
        String type = GeneralConfigTypeEnum.sms.name();
        GeneralConfig stored = generalConfigDao.findByType(type);
        SmsConfig existing = stored == null ? null : read(stored, new TypeReference<>() { });
        SmsConfig merged = mapper.toSmsConfig(request, existing);
        String revision = persist(type, request.getExpectedRevision(), stored, merged);
        configService.handleConfig(type, merged);
        return MessageServerConfigResult.configured(revision, mapper.toSmsResponse(merged));
    }

    private String persist(String type, String expectedRevision, GeneralConfig stored, Object config) {
        if (stored == null) {
            if (!MISSING_REVISION.equals(expectedRevision)) {
                throw new MessageServerConfigConflictException();
            }
            return create(type, config);
        }
        if (!stored.getRevision().equals(expectedRevision)) {
            throw new MessageServerConfigConflictException();
        }
        String nextRevision = UUID.randomUUID().toString();
        int updated = generalConfigDao.updateContentIfRevision(
                type, serialize(config), nextRevision, expectedRevision);
        if (updated != 1) {
            throw new MessageServerConfigConflictException();
        }
        return nextRevision;
    }

    private String create(String type, Object config) {
        String revision = UUID.randomUUID().toString();
        GeneralConfig entity = GeneralConfig.builder()
                .type(type)
                .content(serialize(config))
                .revision(revision)
                .build();
        try {
            generalConfigDao.saveAndFlush(entity);
        } catch (DataIntegrityViolationException exception) {
            throw new MessageServerConfigConflictException();
        }
        return revision;
    }

    private <T> T read(GeneralConfig stored, TypeReference<T> typeReference) {
        T config = JsonUtil.fromJson(stored.getContent(), typeReference);
        if (config == null) {
            throw new IllegalStateException("Message server config could not be read");
        }
        return config;
    }

    private String serialize(Object config) {
        String content = JsonUtil.toJson(config);
        if (content == null) {
            throw new IllegalStateException("Message server config could not be serialized");
        }
        return content;
    }

    private void requireExpectedRevision(String expectedRevision) {
        if (expectedRevision == null || expectedRevision.isBlank()) {
            throw new MessageServerConfigRevisionRequiredException();
        }
    }
}
