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

package org.apache.hertzbeat.warehouse.store.history.tsdb.vm;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Test case for {@link VictoriaMetricsProperties}
 */
@EnableConfigurationProperties(value = VictoriaMetricsProperties.class)
@SpringBootTest(
        classes = VictoriaMetricsPropertiesTest.class,
        properties = {
                "warehouse.store.victoria-metrics.enabled=true",
                "warehouse.store.victoria-metrics.username=test_user",
                "warehouse.store.victoria-metrics.insert.buffer-size=999",
                "warehouse.store.victoria-metrics.insert.compression.enabled=true"
        }
)
class VictoriaMetricsPropertiesTest {

    @Autowired
    private VictoriaMetricsProperties properties;

    @Test
    void propertiesShouldBeInjectedAndCorrectlyBound() {
        assertThat(properties).isNotNull();
        assertThat(properties.enabled()).isTrue();
        // url not configured, default value injected
        assertThat(properties.url()).isEqualTo("http://localhost:8428");
        assertThat(properties.username()).isEqualTo("test_user");
        // password not configured, null injected
        assertThat(properties.password()).isNull();
        assertThat(properties.insert()).isNotNull();
        assertThat(properties.insert().bufferSize()).isEqualTo(999);
        // flush-interval not configured, default value is 3
        assertThat(properties.insert().flushInterval()).isEqualTo(3);
        assertThat(properties.insert().compression()).isNotNull();
        assertThat(properties.insert().compression().enabled()).isTrue();
    }

}
