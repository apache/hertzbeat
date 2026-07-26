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

import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfigState;

/**
 * Owns saved model provider configurations and their active selection.
 */
public interface ModelProviderConfigurationService {

    ModelProviderConfigState getState();

    ModelProviderConfig getConfiguration(String uid);

    ModelProviderConfig getActiveConfiguration();

    ModelProviderConfigState createConfiguration(ModelProviderConfig config);

    ModelProviderConfigState updateConfiguration(String uid, ModelProviderConfig config);

    ModelProviderConfigState deleteConfiguration(String uid);

    ModelProviderConfigState switchActiveConfiguration(String uid);
}
