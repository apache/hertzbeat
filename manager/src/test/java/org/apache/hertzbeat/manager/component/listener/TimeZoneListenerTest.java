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

package org.apache.hertzbeat.manager.component.listener;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.text.SimpleDateFormat;
import java.util.TimeZone;
import org.apache.hertzbeat.common.support.event.SystemConfigChangeEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * test case for {@link TimeZoneListener}
 */

@ExtendWith(MockitoExtension.class)
class TimeZoneListenerTest {

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private TimeZoneListener timeZoneListener;

    @Mock
    private SystemConfigChangeEvent event;

    @BeforeEach
    void setUp() {

        ReflectionTestUtils.setField(timeZoneListener, "objectMapper", objectMapper);
    }

    @Test
    void testOnEvent() {

        when(objectMapper.setTimeZone(any(TimeZone.class))).thenReturn(objectMapper);
        when(objectMapper.setDateFormat(any(SimpleDateFormat.class))).thenReturn(objectMapper);

        Object eventSource = new Object();
        when(event.getSource()).thenReturn(eventSource);

        timeZoneListener.onEvent(event);

        SimpleDateFormat expectedDateFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSX");
        expectedDateFormat.setTimeZone(TimeZone.getDefault());

        verify(objectMapper).setTimeZone(TimeZone.getDefault());
        verify(objectMapper).setDateFormat(expectedDateFormat);
    }

}
