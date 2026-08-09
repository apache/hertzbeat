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

package org.apache.hertzbeat.startup.runtime;

import java.nio.file.Path;
import java.util.Map;
import org.apache.hertzbeat.manager.maintenance.StandaloneDeploymentOwnerView;
import org.apache.hertzbeat.manager.setup.config.SetupInstallationPaths;
import org.apache.hertzbeat.bootstrap.SetupOnlyApplication;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.apache.hertzbeat.manager.setup.runtime.SetupRuntimeTransition;
import org.apache.hertzbeat.startup.HertzBeatApplication;
import org.apache.hertzbeat.startup.config.ManagedConfigEnvironmentPostProcessor;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

/** Spring implementation with explicit AOT-visible source classes. */
public final class SpringStartupContextLauncher implements StartupContextLauncher {

    @Override
    public RunningApplicationContext launch(
            StartupDecision decision, String[] args, SetupRuntimeTransition setupRuntimeTransition) {
        ConfigurableApplicationContext context = launchSpringContext(
                decision, args, setupRuntimeTransition, null, null);
        return new SpringRunningApplicationContext(decision.mode(), context);
    }

    @Override
    public RunningApplicationContext launch(
            StartupDecision decision,
            String[] args,
            SetupRuntimeTransition setupRuntimeTransition,
            Path installationRoot,
            StandaloneDeploymentOwnerView authorityView) {
        ConfigurableApplicationContext context = launchSpringContext(
                decision, args, setupRuntimeTransition, installationRoot, authorityView);
        return new SpringRunningApplicationContext(decision.mode(), context);
    }

    ConfigurableApplicationContext launchSpringContext(
            StartupDecision decision, String[] args, SetupRuntimeTransition setupRuntimeTransition) {
        return launchSpringContext(decision, args, setupRuntimeTransition, null, null);
    }

    private ConfigurableApplicationContext launchSpringContext(
            StartupDecision decision,
            String[] args,
            SetupRuntimeTransition setupRuntimeTransition,
            Path installationRoot,
            StandaloneDeploymentOwnerView authorityView) {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().addFirst(new MapPropertySource(
                ManagedConfigEnvironmentPostProcessor.INTERNAL_RUNTIME_PROPERTY_SOURCE,
                internalProperties(decision, installationRoot)));
        return new SpringApplicationBuilder(sourceFor(decision.mode()))
                .environment(environment)
                .initializers(context -> {
                    context.getBeanFactory().registerSingleton(
                            "setupRuntimeTransition", setupRuntimeTransition);
                    if (decision.mode() == RuntimeMode.NORMAL && authorityView != null) {
                        context.getBeanFactory().registerSingleton(
                                "standaloneDeploymentOwnerView", authorityView);
                    }
                })
                .run(args);
    }

    private Map<String, Object> internalProperties(StartupDecision decision, Path installationRoot) {
        if (installationRoot == null) {
            return Map.of(RuntimeMode.PROPERTY_NAME, decision.mode().value());
        }
        return Map.of(
                RuntimeMode.PROPERTY_NAME, decision.mode().value(),
                SetupInstallationPaths.ROOT_PROPERTY, installationRoot.toString());
    }

    static Class<?> sourceFor(RuntimeMode mode) {
        return mode == RuntimeMode.NORMAL || mode == RuntimeMode.FULL_SETUP_GATED
                ? HertzBeatApplication.class : SetupOnlyApplication.class;
    }

    private record SpringRunningApplicationContext(RuntimeMode mode, ConfigurableApplicationContext delegate)
            implements RunningApplicationContext {

        @Override
        public boolean isActive() {
            return delegate.isActive();
        }

        @Override
        public void close() {
            delegate.close();
        }
    }
}
