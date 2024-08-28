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

package org.apache.hertzbeat.manager.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.hertzbeat.common.constants.GeneralConfigTypeEnum;
import org.apache.hertzbeat.manager.dao.GeneralConfigDao;
import org.apache.hertzbeat.manager.pojo.dto.SystemSecret;
import org.apache.hertzbeat.manager.service.impl.SystemSecretServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * test case for {@link SystemSecretServiceImpl}
 */

class SystemSecretServiceTest {

    @Mock
    private GeneralConfigDao generalConfigDao;

    @Mock
    private ObjectMapper objectMapper;

    private SystemSecretServiceImpl systemSecretService;

    @BeforeEach
    void setUp() {

        MockitoAnnotations.openMocks(this);

        this.systemSecretService = new SystemSecretServiceImpl(generalConfigDao, objectMapper);
    }

    @Test
    void testType() {

        assertEquals(GeneralConfigTypeEnum.secret.name(), systemSecretService.type());
    }

    @Test
    void testGetTypeReference() {

        TypeReference<SystemSecret> typeReference = systemSecretService.getTypeReference();
        assertEquals(SystemSecret.class, typeReference.getType());
    }

}
