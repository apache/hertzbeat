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

package org.apache.hertzbeat.collector.runtime.otel;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;

/**
 * Wiring for the managed HertzBeat telemetry runtime. The supervisor stays inert unless explicitly enabled.
 */
@AutoConfiguration
@EnableConfigurationProperties(OtelRuntimeProperties.class)
public class OtelRuntimeConfiguration {

    @Bean
    OtelRuntimeBinaryResolver otelRuntimeBinaryResolver(OtelRuntimeProperties properties) {
        return new OtelRuntimeBinaryResolver(properties);
    }

    @Bean
    OtelRuntimeConfigRenderer otelRuntimeConfigRenderer() {
        return new OtelRuntimeConfigRenderer();
    }

    @Bean
    OtelRuntimeConfigTransaction otelRuntimeConfigTransaction(OtelRuntimeConfigRenderer renderer) {
        return new OtelRuntimeConfigTransaction(renderer);
    }

    @Bean
    OtelRuntimeProcessLauncher otelRuntimeProcessLauncher() {
        return new OtelRuntimeProcessLauncher();
    }

    @Bean
    OtelRuntimeHealthClient otelRuntimeHealthClient() {
        return new OtelRuntimeHealthClient();
    }

    @Bean(destroyMethod = "close")
    OtelRuntimeSupervisor otelRuntimeSupervisor(OtelRuntimeProperties properties,
                                                OtelRuntimeBinaryResolver resolver,
                                                OtelRuntimeConfigTransaction configTransaction,
                                                OtelRuntimeProcessLauncher launcher,
                                                OtelRuntimeHealthClient healthClient) {
        return new OtelRuntimeSupervisor(properties, resolver, configTransaction, launcher, healthClient);
    }

    @Bean
    OtelRuntimeStatusProvider otelRuntimeStatusProvider(OtelRuntimeProperties properties,
                                                        OtelRuntimeSupervisor supervisor) {
        return new OtelRuntimeStatusProvider(properties, supervisor);
    }
}
