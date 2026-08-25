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

package org.apache.hertzbeat.manager.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotSame;

import java.lang.reflect.Field;
import java.time.Duration;
import java.util.Map;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.web.client.RestTemplate;

/**
 * Contract for bounded, role-specific HTTP clients.
 */
class RestTemplateConfigTest {

    @Test
    void exposesTimeoutsAsTypedDurations() throws ReflectiveOperationException {
        Field connectTimeout = NetworkConstants.HttpClientConstants.class.getField("CONNECT_TIMEOUT");
        Field readTimeout = NetworkConstants.HttpClientConstants.class.getField("READ_TIMEOUT");
        Field writeTimeout = NetworkConstants.HttpClientConstants.class.getField("WRITE_TIMEOUT");

        assertEquals(Duration.class, connectTimeout.getType());
        assertEquals(Duration.ofSeconds(6), connectTimeout.get(null));
        assertEquals(Duration.ofSeconds(6), readTimeout.get(null));
        assertEquals(Duration.ofSeconds(6), writeTimeout.get(null));
    }

    @Test
    void providesPrimaryDefaultAndDedicatedGreptimeQueryClients() {
        try (AnnotationConfigApplicationContext context =
                     new AnnotationConfigApplicationContext(RestTemplateConfig.class)) {
            Map<String, RestTemplate> clients = context.getBeansOfType(RestTemplate.class);

            assertEquals(2, clients.size());
            assertNotSame(
                    context.getBean("restTemplate", RestTemplate.class),
                    context.getBean("greptimeQueryRestTemplate", RestTemplate.class));
            assertEquals(context.getBean("restTemplate", RestTemplate.class), context.getBean(RestTemplate.class));
        }
    }
}
