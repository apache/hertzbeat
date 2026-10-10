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

package org.apache.hertzbeat.manager.service.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.manager.dao.ParamDao;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for old monitor submitted parameter query evidence.
 */
@ExtendWith(MockitoExtension.class)
class OldMonitorParamQueryServiceTest {

    @InjectMocks
    private OldMonitorParamQueryService oldMonitorParamQueryService;

    @Mock
    private ParamDao paramDao;

    @Test
    void findParamsByMonitorIdReturnsPersistedParams() {
        List<Param> params = List.of(new Param());
        when(paramDao.findParamsByMonitorId(42L)).thenReturn(params);

        List<Param> actual = oldMonitorParamQueryService.findParamsByMonitorId(42L);

        assertEquals(params, actual);
        verify(paramDao).findParamsByMonitorId(42L);
    }

    @Test
    void findParamsByMonitorIdSkipsMissingMonitorId() {
        List<Param> params = oldMonitorParamQueryService.findParamsByMonitorId(null);

        assertTrue(params.isEmpty());
        verifyNoInteractions(paramDao);
    }
}
