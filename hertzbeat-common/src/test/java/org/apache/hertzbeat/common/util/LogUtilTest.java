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

package org.apache.hertzbeat.common.util;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.slf4j.Logger;
import java.lang.reflect.Method;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.anyString;
import static org.mockito.Mockito.contains;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LogUtilTest {

    @Mock
    private Logger mockLogger;
    
    private AutoCloseable mocks;

    @BeforeEach
    void setUp() {
        mocks = MockitoAnnotations.openMocks(this);
    }
    
    @AfterEach
    void tearDown() throws Exception {
        if (mocks != null) {
            mocks.close();
        }
    }

    @Test
    void testFormat_noParams_returnsOriginalMessage() throws Exception {
        String original = "hello world";
        Method formatMethod = LogUtil.class.getDeclaredMethod("format", String.class, Object[].class);
        formatMethod.setAccessible(true);
        String formatted = (String) formatMethod.invoke(null, original, new Object[0]);
        assertEquals(original, formatted);
    }

    @Test
    void testFormat_withParams_replacesPlaceholders() throws Exception {
        String template = "hello,{0}, world {1}!";
        Method formatMethod = LogUtil.class.getDeclaredMethod("format", String.class, Object[].class);
        formatMethod.setAccessible(true);
        Object[] params = {"Alice", 123};
        String result = (String) formatMethod.invoke(null, template, params);
        assertTrue(result.contains("hello,Alice"));
        assertTrue(result.contains("world 123!"));
    }

    @Test
    void testDebug_noParams_logsRawMessage() {
        when(mockLogger.isDebugEnabled()).thenReturn(true);
        String msg = "test-debug";
        LogUtil.debug(mockLogger, msg);
        verify(mockLogger).debug(contains(msg));
    }

    @Test
    void testDebug_withParams_logsFormattedMessage() {
        when(mockLogger.isDebugEnabled()).thenReturn(true);
        LogUtil.debug(mockLogger, "user={0}", "Bob");
        verify(mockLogger).debug(contains("user=Bob"));
    }

    @Test
    void testInfo_levelOff_doesNotLog() {
        when(mockLogger.isInfoEnabled()).thenReturn(false);
        LogUtil.info(mockLogger, "should-not-log");
        verify(mockLogger, never()).info(anyString());
    }

    @Test
    void testWarn_withException_logsMessageAndException() {
        when(mockLogger.isWarnEnabled()).thenReturn(true);
        RuntimeException ex = new RuntimeException("warn-ex");
        LogUtil.warn(mockLogger, ex, "warning {0}", "occurred");
        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(mockLogger).warn(captor.capture(), eq(ex));
        assertTrue(captor.getValue().contains("warning occurred"));
    }

    @Test
    void testError_withExceptionAndParams_logsError() {
        when(mockLogger.isErrorEnabled()).thenReturn(true);
        RuntimeException ex = new RuntimeException("err");
        LogUtil.error(mockLogger, ex, "fail code {0}", 500);
        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(mockLogger).error(captor.capture(), eq(ex));
        assertTrue(captor.getValue().contains("fail code 500"));
    }
}
