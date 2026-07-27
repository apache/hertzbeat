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

package org.apache.hertzbeat.manager.config;

import org.junit.jupiter.api.Test;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.event.ContextClosedEvent;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.lang.reflect.Field;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class ManagerSseManagerTest {

    @Test
    void closesActiveEmittersBeforeApplicationShutdown() throws Exception {
        ManagerSseManager manager = new ManagerSseManager();
        SseEmitter emitter = mock(SseEmitter.class);
        Map<Long, SseEmitter> emitters = emitters(manager);
        emitters.put(1L, emitter);

        manager.onApplicationEvent(new ContextClosedEvent(mock(ConfigurableApplicationContext.class)));
        manager.createEmitter(2L);

        verify(emitter).complete();
        assertFalse(emitters.containsKey(1L));
        assertFalse(emitters.containsKey(2L), "Shutdown must not retain a concurrent late subscriber");
    }

    @SuppressWarnings("unchecked")
    private Map<Long, SseEmitter> emitters(ManagerSseManager manager) throws Exception {
        Field emittersField = ManagerSseManager.class.getDeclaredField("emitters");
        emittersField.setAccessible(true);
        return (Map<Long, SseEmitter>) emittersField.get(manager);
    }
}
