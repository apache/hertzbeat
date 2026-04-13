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

package org.apache.hertzbeat.common.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.common.entity.dto.sms.SmsConfig;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class SmsConfigBindingTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(BindingConfig.class);

    @Test
    void bindsRuntimeSmsConfigWithoutSpringAnnotationsOnModel() {
        contextRunner.withPropertyValues(
                        "alerter.sms.enable=true",
                        "alerter.sms.type=smslocal",
                        "alerter.sms.smslocal.api-key=test-key")
                .run(context -> {
                    SmsConfig smsConfig = context.getBean(SmsConfig.class);
                    assertTrue(smsConfig.isEnable());
                    assertEquals("smslocal", smsConfig.getType());
                    assertEquals("test-key", smsConfig.getSmslocal().getApiKey());
                });
    }

    @EnableConfigurationProperties(SmsConfigBinding.class)
    static class BindingConfig {
    }
}
