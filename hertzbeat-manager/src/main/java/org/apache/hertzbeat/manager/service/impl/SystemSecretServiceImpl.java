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

package org.apache.hertzbeat.manager.service.impl;

import java.lang.reflect.Type;
import org.apache.hertzbeat.common.constants.GeneralConfigTypeEnum;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.manager.pojo.dto.SystemSecret;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;

/**
 * system config service impl
 */
@Service
public class SystemSecretServiceImpl extends AbstractGeneralConfigServiceImpl<SystemSecret> {

    public SystemSecretServiceImpl(GeneralConfigDao generalConfigDao) {
        super(generalConfigDao);
    }

    @Override
    public String type() {
        return GeneralConfigTypeEnum.secret.name();
    }

    @Override
    public TypeReference<SystemSecret> getTypeReference() {
        return new TypeReference<>() {
            @Override
            public Type getType() {
                return SystemSecret.class;
            }
        };
    }
}
