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

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.doAnswer;

import java.util.function.BiConsumer;
import java.util.function.Consumer;

import static org.mockito.Mockito.any;

import org.apache.hertzbeat.manager.service.impl.DefaultPluginRunner;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link DefaultPluginRunner}
 */
@ExtendWith(MockitoExtension.class)
public class DefaultPluginRunnerTest {
    @Mock
    private PluginService pluginService;
    @InjectMocks
    private DefaultPluginRunner defaultPluginRunner;

    @Test
    public void testPluginExecute() {
        assertDoesNotThrow(() -> {
            doAnswer(invocation -> {
                // no nothing
                return null;
            }).when(pluginService).pluginExecute(any(Class.class), any(Consumer.class));
            doAnswer(invocation -> {
                // no nothing
                return null;
            }).when(pluginService).pluginExecute(any(Class.class), any(BiConsumer.class));
            defaultPluginRunner.pluginExecute(String.class, (s) -> {});
            defaultPluginRunner.pluginExecute(String.class, (a, b)->{});
        });
        
        assertDoesNotThrow(() -> {
            doAnswer(invocation -> {
                throw new RuntimeException("sample");
            }).when(pluginService).pluginExecute(any(Class.class), any(Consumer.class));
            doAnswer(invocation -> {
                throw new RuntimeException("sample");
            }).when(pluginService).pluginExecute(any(Class.class), any(BiConsumer.class));
            defaultPluginRunner.pluginExecute(String.class, (s) -> {});
            defaultPluginRunner.pluginExecute(String.class, (a, b)->{});
        });
    }
}
