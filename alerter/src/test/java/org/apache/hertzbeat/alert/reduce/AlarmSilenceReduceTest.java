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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Collections;
import java.util.HashMap;
import org.apache.hertzbeat.alert.dao.AlertSilenceDao;
import org.apache.hertzbeat.common.cache.CacheFactory;
import org.apache.hertzbeat.common.cache.CommonCacheService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.alerter.AlertSilence;
import org.apache.hertzbeat.common.entity.manager.TagItem;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.MockitoAnnotations;

/**
 * test case for {@link AlarmSilenceReduce}
 */

class AlarmSilenceReduceTest {

    @Mock
    private AlertSilenceDao alertSilenceDao;

    @Mock
    private CommonCacheService<String, Object> silenceCache;

    private AlarmSilenceReduce alarmSilenceReduce;

    private MockedStatic<CacheFactory> cacheFactoryMockedStatic;

    @BeforeEach
    void setUp() {

        MockitoAnnotations.openMocks(this);

        cacheFactoryMockedStatic = mockStatic(CacheFactory.class);
        cacheFactoryMockedStatic.when(CacheFactory::getAlertSilenceCache).thenReturn(silenceCache);

        // inject dao object.
        alarmSilenceReduce = new AlarmSilenceReduce(alertSilenceDao);
    }

    @Test
    void testFilterSilenceNull() {

        // when cache get result is null, exec db logic.
        when(silenceCache.get(CommonConstants.CACHE_ALERT_SILENCE)).thenReturn(null);
        doReturn(Collections.emptyList()).when(alertSilenceDao).findAll();

        Alert alert = Alert.builder()
                .tags(new HashMap<>())
                .priority((byte) 1)
                .build();

        boolean result = alarmSilenceReduce.filterSilence(alert);

        assertTrue(result);
        verify(alertSilenceDao, times(1)).findAll();
        verify(silenceCache, times(1)).put(eq(CommonConstants.CACHE_ALERT_SILENCE), any());
    }

    @Test
    void testFilterSilenceOnce() {

        AlertSilence alertSilence = AlertSilence.builder()
                .enable(Boolean.TRUE)
                .matchAll(Boolean.TRUE)
                .type((byte) 0)
                .periodEnd(LocalDateTime.now().atZone(ZoneId.systemDefault()).plusHours(1))
                .periodStart(LocalDateTime.now().atZone(ZoneId.systemDefault()).minusHours(1))
                .times(0)
                .build();

        when(silenceCache.get(CommonConstants.CACHE_ALERT_SILENCE)).thenReturn(Collections.singletonList(alertSilence));
        doReturn(alertSilence).when(alertSilenceDao).save(alertSilence);

        Alert alert = Alert.builder()
                .tags(new HashMap<>())
                .priority((byte) 1)
                .build();

        boolean result = alarmSilenceReduce.filterSilence(alert);

        assertFalse(result);
        verify(alertSilenceDao, times(1)).save(alertSilence);
        assertEquals(1, alertSilence.getTimes());
    }

    @Test
    void testFilterSilenceCyc() {

        AlertSilence alertSilence = AlertSilence.builder()
                .enable(Boolean.TRUE)
                .matchAll(Boolean.TRUE)
                .type((byte) 1)  // cyc time
                .periodEnd(LocalDateTime.now().atZone(ZoneId.systemDefault()).plusHours(1))
                .periodStart(LocalDateTime.now().atZone(ZoneId.systemDefault()).minusHours(1))
                .times(0)
                .days(Collections.singletonList((byte) LocalDateTime.now().getDayOfWeek().getValue()))
                .build();

        when(silenceCache.get(CommonConstants.CACHE_ALERT_SILENCE)).thenReturn(Collections.singletonList(alertSilence));
        doReturn(alertSilence).when(alertSilenceDao).save(alertSilence);

        Alert alert = Alert.builder()
                .tags(new HashMap<>())
                .priority((byte) 1)
                .build();

        boolean result = alarmSilenceReduce.filterSilence(alert);

        assertFalse(result);
        verify(alertSilenceDao, times(1)).save(alertSilence);
        assertEquals(1, alertSilence.getTimes());
    }

    @Test
    void testFilterSilenceNoMatch() {

        AlertSilence alertSilence = AlertSilence.builder()
                .enable(Boolean.TRUE)
                .matchAll(Boolean.TRUE)
                .type((byte) 0)
                .tags(Collections.singletonList(new TagItem("non-matching-tag", "value")))
                .periodEnd(LocalDateTime.now().atZone(ZoneId.systemDefault()).minusHours(1))
                .periodStart(LocalDateTime.now().atZone(ZoneId.systemDefault()).plusHours(1))
                .times(0)
                .build();

        when(silenceCache.get(CommonConstants.CACHE_ALERT_SILENCE)).thenReturn(Collections.singletonList(alertSilence));
        doReturn(alertSilence).when(alertSilenceDao).save(alertSilence);

        Alert alert = Alert.builder()
                .tags(new HashMap<>())
                .priority((byte) 1)
                .build();

        boolean result = alarmSilenceReduce.filterSilence(alert);

        assertTrue(result);
        verify(alertSilenceDao, never()).save(any());
    }

    @AfterEach
    public void tearDown() {

        if (cacheFactoryMockedStatic != null) {
            cacheFactoryMockedStatic.close();
        }
    }

}
