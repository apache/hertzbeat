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

package org.apache.hertzbeat.alert.reduce;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.util.Collections;
import java.util.HashMap;
import org.apache.hertzbeat.alert.dao.AlertConvergeDao;
import org.apache.hertzbeat.common.cache.CacheFactory;
import org.apache.hertzbeat.common.cache.CommonCacheService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * test case for {@link AlarmConvergeReduce}
 */

@ExtendWith(MockitoExtension.class)
class AlarmConvergeReduceTest {

    @Mock
    private AlertConvergeDao alertConvergeDao;

    @Mock
    private CommonCacheService<String, Object> convergeCache;

    private AlarmConvergeReduce alarmConvergeReduce;

    private Alert testAlert;

    private MockedStatic<CacheFactory> cacheFactoryMockedStatic;

    @BeforeEach
    void setUp() {

        testAlert = Alert.builder()
                .tags(new HashMap<>())
                .status(CommonConstants.ALERT_STATUS_CODE_SOLVED)
                .build();

        cacheFactoryMockedStatic = mockStatic(CacheFactory.class);
        cacheFactoryMockedStatic.when(CacheFactory::getAlertConvergeCache).thenReturn(convergeCache);

        alarmConvergeReduce = new AlarmConvergeReduce(alertConvergeDao);
    }

    @AfterEach
    void tearDown() {

        if (cacheFactoryMockedStatic != null) {
            cacheFactoryMockedStatic.close();
        }
    }

    @Test
    void testFilterConverge_RestoredAlert() {

        testAlert.setStatus(CommonConstants.ALERT_STATUS_CODE_RESTORED);
        boolean result = alarmConvergeReduce.filterConverge(testAlert);

        assertTrue(result);
    }

    @Test
    void testFilterConverge_IgnoreTag() {

        testAlert.getTags().put(CommonConstants.IGNORE, "true");
        boolean result = alarmConvergeReduce.filterConverge(testAlert);

        assertTrue(result);
    }

    @Test
    void testFilterConvergeNoConverge() {

        when(convergeCache.get(CommonConstants.CACHE_ALERT_CONVERGE)).thenReturn(null);
        when(alertConvergeDao.findAll()).thenReturn(Collections.emptyList());

        boolean result = alarmConvergeReduce.filterConverge(testAlert);

        assertTrue(result);
        verify(convergeCache).get(CommonConstants.CACHE_ALERT_CONVERGE);
        verify(alertConvergeDao).findAll();
        verify(convergeCache).put(CommonConstants.CACHE_ALERT_CONVERGE, Collections.emptyList());
    }

}
