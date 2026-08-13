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

package org.apache.hertzbeat.manager.service.impl;

import org.apache.hertzbeat.common.runtime.ConditionalOnNormalBusinessRuntime;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Initializes Manager business runtime state after setup completes. Object-store runtime must be ready before
 * monitor definitions choose their backing store; stored plugin parameters must then precede plugin status and
 * classloader convergence so loaded plugins see their persisted configuration.
 */
@Component
@ConditionalOnNormalBusinessRuntime
public final class ManagerBusinessRuntimeInitializer implements CommandLineRunner {

    private final ObjectStoreConfigServiceImpl objectStoreConfigService;
    private final AppServiceImpl appService;
    private final PluginParameterServiceImpl pluginParameterService;
    private final PluginServiceImpl pluginService;

    public ManagerBusinessRuntimeInitializer(ObjectStoreConfigServiceImpl objectStoreConfigService,
                                             AppServiceImpl appService,
                                             PluginParameterServiceImpl pluginParameterService,
                                             PluginServiceImpl pluginService) {
        this.objectStoreConfigService = objectStoreConfigService;
        this.appService = appService;
        this.pluginParameterService = pluginParameterService;
        this.pluginService = pluginService;
    }

    @Override
    public void run(String... args) {
        objectStoreConfigService.initializeRuntimeState();
        appService.initializeRuntimeDefinitions();
        pluginParameterService.loadStoredParameters();
        pluginService.syncPluginStatus();
        pluginService.loadJarToClassLoader();
    }
}
