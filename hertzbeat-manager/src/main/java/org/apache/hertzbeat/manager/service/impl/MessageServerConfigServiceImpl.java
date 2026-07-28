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

import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.constants.GeneralConfigTypeEnum;
import org.apache.hertzbeat.common.entity.dto.MailServerConfig;
import org.apache.hertzbeat.common.entity.dto.sms.SmsConfig;
import org.apache.hertzbeat.manager.pojo.dto.EmailServerConfigRequest;
import org.apache.hertzbeat.manager.pojo.dto.EmailServerConfigResponse;
import org.apache.hertzbeat.manager.pojo.dto.MessageServerConfigResult;
import org.apache.hertzbeat.manager.pojo.dto.SmsServerConfigRequest;
import org.apache.hertzbeat.manager.pojo.dto.SmsServerConfigResponse;
import org.apache.hertzbeat.manager.service.ConfigService;
import org.apache.hertzbeat.manager.service.MessageServerConfigMapper;
import org.apache.hertzbeat.manager.service.MessageServerConfigService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Coordinates safe mapping, persistence, and authoritative rereads. */
@Service
public class MessageServerConfigServiceImpl implements MessageServerConfigService {

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
        MailServerConfig config = readEmail();
        return config == null ? MessageServerConfigResult.missing()
                : MessageServerConfigResult.configured(mapper.toEmailResponse(config));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MessageServerConfigResult<EmailServerConfigResponse> saveEmailConfig(EmailServerConfigRequest request) {
        lockExistingConfigForMutation(GeneralConfigTypeEnum.email.name());
        configService.saveConfig(GeneralConfigTypeEnum.email.name(), mapper.toEmailConfig(request, readEmail()));
        MailServerConfig saved = readEmail();
        if (saved == null) {
            throw new IllegalStateException("Email server config was not persisted");
        }
        return MessageServerConfigResult.configured(mapper.toEmailResponse(saved));
    }

    @Override
    public MessageServerConfigResult<SmsServerConfigResponse> getSmsConfig() {
        SmsConfig config = readSms();
        return config == null ? MessageServerConfigResult.missing()
                : MessageServerConfigResult.configured(mapper.toSmsResponse(config));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MessageServerConfigResult<SmsServerConfigResponse> saveSmsConfig(SmsServerConfigRequest request) {
        lockExistingConfigForMutation(GeneralConfigTypeEnum.sms.name());
        configService.saveConfig(GeneralConfigTypeEnum.sms.name(), mapper.toSmsConfig(request, readSms()));
        SmsConfig saved = readSms();
        if (saved == null) {
            throw new IllegalStateException("SMS server config was not persisted");
        }
        return MessageServerConfigResult.configured(mapper.toSmsResponse(saved));
    }

    private MailServerConfig readEmail() {
        Object config = configService.getConfig(GeneralConfigTypeEnum.email.name());
        if (config == null) {
            return null;
        }
        if (!(config instanceof MailServerConfig email)) {
            throw new IllegalStateException("Unexpected email server config type");
        }
        return email;
    }

    private SmsConfig readSms() {
        Object config = configService.getConfig(GeneralConfigTypeEnum.sms.name());
        if (config == null) {
            return null;
        }
        if (!(config instanceof SmsConfig sms)) {
            throw new IllegalStateException("Unexpected SMS server config type");
        }
        return sms;
    }

    private void lockExistingConfigForMutation(String type) {
        // Once configured, hold the exact row lock across secret merge, persistence, and authoritative reread.
        generalConfigDao.findByTypeForUpdate(type);
    }
}
