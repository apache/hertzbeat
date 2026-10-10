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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.entity.job.RuntimeParamDefine;
import org.apache.hertzbeat.common.entity.plugin.PluginConfig;
import org.apache.hertzbeat.common.entity.plugin.PluginContext;
import org.apache.hertzbeat.common.util.AesUtil;
import org.apache.hertzbeat.manager.pojo.dto.PluginParam;
import org.apache.hertzbeat.manager.service.plugin.PluginParameterRegistry;
import org.junit.jupiter.api.Test;

/**
 * Runtime secret boundary contract for plugin parameters.
 */
class PluginParameterRegistryTest {

    @Test
    void runtimeParametersAreDecryptedCopiesAndStoredCacheRemainsCiphertext() {
        String ciphertext = AesUtil.aesEncode("runtime-secret");
        PluginParam stored = PluginParam.builder()
                .pluginMetadataId(7L)
                .field("token")
                .paramValue(ciphertext)
                .type(CommonConstants.PARAM_TYPE_STRING)
                .build();
        PluginParameterRegistry registry = new PluginParameterRegistry();
        registry.registerDefinition(7L, passwordConfig());
        registry.replaceStoredParameters(7L, List.of(stored));

        List<Configmap> first = registry.runtimeParameters(7L);
        List<Configmap> second = registry.runtimeParameters(7L);

        assertEquals("runtime-secret", first.get(0).getValue());
        assertEquals("runtime-secret", second.get(0).getValue());
        assertNotSame(first, second);
        assertNotSame(first.get(0), second.get(0));
        first.get(0).setValue("mutated-by-plugin");
        assertEquals(ciphertext, registry.storedParameters(7L).get(0).getParamValue());
        assertEquals("runtime-secret", registry.runtimeParameters(7L).get(0).getValue());
        PluginContext callbackContext = registry.runtimeContext(7L);
        assertEquals("runtime-secret", callbackContext.param().getString("token", null));
    }

    @Test
    void legacyPlaintextPasswordRemainsRuntimeCompatibleWithoutBeingExposedByTheRegistry() {
        PluginParam legacy = PluginParam.builder()
                .pluginMetadataId(7L)
                .field("token")
                .paramValue("legacy-plaintext")
                .type(CommonConstants.PARAM_TYPE_STRING)
                .build();
        PluginParameterRegistry registry = new PluginParameterRegistry();
        registry.registerDefinition(7L, passwordConfig());
        registry.replaceStoredParameters(7L, List.of(legacy));

        assertEquals("legacy-plaintext", registry.runtimeParameters(7L).get(0).getValue());
        assertNotSame(legacy, registry.storedParameters(7L).get(0));
    }

    @Test
    void registrationRejectsMalformedDefinitionsAndKeepsDefensiveCopy() {
        PluginParameterRegistry registry = new PluginParameterRegistry();
        PluginConfig config = passwordConfig();
        registry.registerDefinition(7L, config);
        config.getParams().get(0).setField("mutated-after-registration");
        registry.definition(7L).orElseThrow().getParams().get(0).setField("mutated-returned-copy");

        assertEquals("token", registry.definition(7L).orElseThrow().getParams().get(0).getField());

        PluginConfig duplicate = new PluginConfig();
        duplicate.setParams(List.of(
                RuntimeParamDefine.builder().field("token").type("password").build(),
                RuntimeParamDefine.builder().field("token").type("text").build()));
        assertThrows(IllegalArgumentException.class, () -> registry.registerDefinition(8L, duplicate));

        PluginConfig blank = new PluginConfig();
        blank.setParams(List.of(RuntimeParamDefine.builder().field(" ").type("password").build()));
        assertThrows(IllegalArgumentException.class, () -> registry.registerDefinition(9L, blank));
    }

    private static PluginConfig passwordConfig() {
        PluginConfig config = new PluginConfig();
        config.setParams(List.of(RuntimeParamDefine.builder().field("token").type("password").build()));
        return config;
    }
}
