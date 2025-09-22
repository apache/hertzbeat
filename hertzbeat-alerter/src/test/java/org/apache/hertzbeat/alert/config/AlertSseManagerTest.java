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

package org.apache.hertzbeat.alert.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.lang.reflect.Field;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;

/**
 * alert sse manager test
 */
public class AlertSseManagerTest {

    private AlertSseManager alertSseManager;

    @BeforeEach
    void setUp() {
        alertSseManager = new AlertSseManager();
    }

    @Test
    void testCompleteThrowsException() throws Exception {
        SseEmitter emitter = alertSseManager.createEmitter(1L);
        assertNotNull(emitter);

        Map<Long, SseEmitter> emitters = new HashMap<>();
        SseEmitter spyEmitter = mock(SseEmitter.class);
        
        doThrow(new IllegalStateException("Simulated output stream error")).when(spyEmitter).send(any(SseEmitter.SseEventBuilder.class));
        doThrow(new RuntimeException("Complete failed")).when(spyEmitter).complete();
        
        emitters.put(1L, spyEmitter);

        Field emittersField = AlertSseManager.class.getDeclaredField("emitters");
        emittersField.setAccessible(true);
        emittersField.set(alertSseManager, emitters);

        assertThrows(RuntimeException.class, () -> alertSseManager.broadcast("{\"id\":1,\"content\":\"Test alert\"}"));
        Map<Long, SseEmitter> currentEmitters = (Map<Long, SseEmitter>) emittersField.get(alertSseManager);
        assertFalse(currentEmitters.containsKey(1L), "Emitter should still exist because complete() threw exception");
    }

}