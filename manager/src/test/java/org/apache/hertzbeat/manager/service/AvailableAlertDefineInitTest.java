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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.dao.AlertDefineDao;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.job.Job;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * test case for {@link AvailableAlertDefineInit}
 */

class AvailableAlertDefineInitTest {

    @Mock
    private AlertDefineDao alertDefineDao;

    @Mock
    private AppService appService;

    @InjectMocks
    private AvailableAlertDefineInit availableAlertDefineInit;

    private Map<String, Job> map;

    @BeforeEach
    void setUp() {

        MockitoAnnotations.openMocks(this);

        map = new HashMap<>();
        map.put("testApp", new Job());
    }

    @Test
    void testRunAlertDefineIsEmpty() throws Exception {


        when(appService.getAllAppDefines()).thenReturn(map);

        when(alertDefineDao.queryAlertDefineByAppAndMetric("testApp", CommonConstants.AVAILABILITY))
                .thenReturn(Collections.emptyList());

        availableAlertDefineInit.run();

        verify(alertDefineDao, times(1)).save(any(AlertDefine.class));
    }

    @Test
    void testRunAlertDefineExists() throws Exception {

        when(appService.getAllAppDefines()).thenReturn(map);
        when(alertDefineDao.queryAlertDefineByAppAndMetric("testApp", CommonConstants.AVAILABILITY))
                .thenReturn(List.of(new AlertDefine()));
        availableAlertDefineInit.run();

        verify(alertDefineDao, never()).save(any(AlertDefine.class));
    }

    @Test
    void testRunExceptionHandling() throws Exception {

        when(appService.getAllAppDefines()).thenReturn(map);
        when(alertDefineDao.queryAlertDefineByAppAndMetric("testApp", CommonConstants.AVAILABILITY))
                .thenThrow(new RuntimeException("Database error"));

        availableAlertDefineInit.run();

        verify(alertDefineDao, never()).save(any(AlertDefine.class));
    }

}
