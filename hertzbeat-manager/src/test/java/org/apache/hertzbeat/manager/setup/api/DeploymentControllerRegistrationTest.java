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

package org.apache.hertzbeat.manager.setup.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.FilterType;
import org.springframework.http.HttpStatus;

/** Proves real component scanning is independent of optional workflow bean definition order. */
class DeploymentControllerRegistrationTest {

    private final ApplicationContextRunner context = new ApplicationContextRunner()
            .withUserConfiguration(ControllerScan.class);

    @Test
    void componentScanAlwaysRegistersSafeTransportWhenDependenciesAreUnavailable() {
        context.run(result -> {
            assertThat(result).hasSingleBean(DeploymentController.class);
            SetupApiException failure = assertThrows(SetupApiException.class,
                    () -> result.getBean(DeploymentController.class).deployment());
            assertEquals(HttpStatus.SERVICE_UNAVAILABLE, failure.status());
            assertEquals(SetupApiContract.SetupErrorCode.MIGRATION_UNAVAILABLE, failure.errorCode());
        });
    }

    @Test
    void componentScanResolvesWorkflowRegisteredAlongsideController() {
        context.withBean(DeploymentWorkflow.class, () -> mock(DeploymentWorkflow.class))
                .run(result -> assertThat(result).hasSingleBean(DeploymentController.class));
    }

    @Configuration(proxyBeanMethods = false)
    @ComponentScan(
            basePackageClasses = DeploymentController.class,
            useDefaultFilters = false,
            includeFilters = @ComponentScan.Filter(
                    type = FilterType.ASSIGNABLE_TYPE, classes = DeploymentController.class))
    static class ControllerScan {
    }
}
