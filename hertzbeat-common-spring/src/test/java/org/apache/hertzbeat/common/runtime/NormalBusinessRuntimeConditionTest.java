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

package org.apache.hertzbeat.common.runtime;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

class NormalBusinessRuntimeConditionTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(ConditionalConfiguration.class);

    @Test
    void fullSetupGatedContextStartsWithoutBusinessSideEffectBean() {
        runner.withPropertyValues(RuntimeMode.PROPERTY_NAME + "=full_setup_gated").run(context -> {
            assertTrue(context.isRunning());
            assertFalse(context.containsBean("businessSideEffect"));
        });
    }

    @Test
    void normalContextRegistersBusinessSideEffectBean() {
        runner.withPropertyValues(RuntimeMode.PROPERTY_NAME + "=normal").run(context ->
                assertTrue(context.containsBean("businessSideEffect")));
    }

    @Test
    void missingRuntimeModePreservesExistingNormalStartup() {
        runner.run(context -> assertTrue(context.containsBean("businessSideEffect")));
    }

    @Configuration(proxyBeanMethods = false)
    static class ConditionalConfiguration {

        @Bean
        @ConditionalOnNormalBusinessRuntime
        String businessSideEffect() {
            return "started";
        }
    }
}
