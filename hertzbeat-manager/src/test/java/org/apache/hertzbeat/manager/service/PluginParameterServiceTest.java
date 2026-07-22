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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Set;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.RuntimeParamDefine;
import org.apache.hertzbeat.common.entity.plugin.PluginConfig;
import org.apache.hertzbeat.common.util.AesUtil;
import org.apache.hertzbeat.manager.component.validator.ParamValidatorManager;
import org.apache.hertzbeat.manager.component.validator.impl.ArrayParamValidator;
import org.apache.hertzbeat.manager.component.validator.impl.BooleanParamValidator;
import org.apache.hertzbeat.manager.component.validator.impl.HostParamValidatorAdapter;
import org.apache.hertzbeat.manager.component.validator.impl.JsonParamValidator;
import org.apache.hertzbeat.manager.component.validator.impl.NumberParamValidator;
import org.apache.hertzbeat.manager.component.validator.impl.OptionParamValidator;
import org.apache.hertzbeat.manager.component.validator.impl.PasswordParamValidator;
import org.apache.hertzbeat.manager.component.validator.impl.TextParamValidator;
import org.apache.hertzbeat.manager.dao.PluginMetadataDao;
import org.apache.hertzbeat.manager.dao.PluginParamDao;
import org.apache.hertzbeat.manager.pojo.dto.PasswordIntent;
import org.apache.hertzbeat.manager.pojo.dto.PluginParam;
import org.apache.hertzbeat.manager.pojo.dto.PluginParameterInput;
import org.apache.hertzbeat.manager.pojo.dto.PluginParameterSaveRequest;
import org.apache.hertzbeat.manager.pojo.dto.PluginParametersVO;
import org.apache.hertzbeat.manager.service.impl.PluginParameterServiceImpl;
import org.apache.hertzbeat.manager.service.plugin.AfterCommitPublisher;
import org.apache.hertzbeat.manager.service.plugin.PluginParameterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Security contract for plugin parameter persistence and API projection.
 */
@ExtendWith({MockitoExtension.class, OutputCaptureExtension.class})
class PluginParameterServiceTest {

    private static final long PLUGIN_ID = 41L;

    @Mock
    private PluginParamDao pluginParamDao;

    @Mock
    private PluginMetadataDao metadataDao;

    private PluginParameterRegistry registry;

    private PluginParameterServiceImpl service;

    @BeforeEach
    void setUp() {
        registry = new PluginParameterRegistry();
        registry.registerDefinition(PLUGIN_ID, pluginConfig());
        ParamValidatorManager validators = new ParamValidatorManager(List.of(
                new NumberParamValidator(), new PasswordParamValidator(), new BooleanParamValidator(),
                new OptionParamValidator(), new TextParamValidator(), new ArrayParamValidator(),
                new JsonParamValidator(), new HostParamValidatorAdapter()));
        service = new PluginParameterServiceImpl(
                pluginParamDao, metadataDao, validators, registry, new AfterCommitPublisher());
        lenient().when(metadataDao.existsById(PLUGIN_ID)).thenReturn(true);
    }

    @Test
    void readReturnsSafeServerDefinitionsAndNeverReturnsPasswordValue() {
        String ciphertext = AesUtil.aesEncode("persisted-secret");
        when(pluginParamDao.findParamsByPluginMetadataId(PLUGIN_ID)).thenReturn(List.of(
                stored("endpoint", "https://example.invalid", CommonConstants.PARAM_TYPE_STRING),
                stored("token", ciphertext, CommonConstants.PARAM_TYPE_PASSWORD)));

        PluginParametersVO result = service.getParameters(PLUGIN_ID);

        assertEquals(3, result.getParamDefines().size());
        assertNull(result.getParamDefines().get(1).getDefaultValue());
        assertNull(result.getParamDefines().get(1).getPlaceholder());
        assertEquals("https://example.invalid", result.getPluginParams().get(0).getValue());
        assertTrue(result.getPluginParams().get(0).isConfigured());
        assertNull(result.getPluginParams().get(1).getValue());
        assertTrue(result.getPluginParams().get(1).isConfigured());
        assertEquals("password", result.getPluginParams().get(1).getType());
    }

    @Test
    void staleReadDoesNotOverwriteNewerRuntimeState() {
        registry.replaceStoredParameters(PLUGIN_ID, List.of(
                stored("endpoint", "new-runtime", CommonConstants.PARAM_TYPE_STRING),
                stored("token", AesUtil.aesEncode("new-secret"), CommonConstants.PARAM_TYPE_PASSWORD)));
        when(pluginParamDao.findParamsByPluginMetadataId(PLUGIN_ID)).thenReturn(List.of(
                stored("endpoint", "stale-read", CommonConstants.PARAM_TYPE_STRING),
                stored("token", AesUtil.aesEncode("stale-secret"), CommonConstants.PARAM_TYPE_PASSWORD)));

        service.getParameters(PLUGIN_ID);

        assertEquals("new-runtime", registry.runtimeContext(PLUGIN_ID).param().getString("endpoint", null));
        assertEquals("new-secret", registry.runtimeContext(PLUGIN_ID).param().getString("token", null));
    }

    @Test
    void replaceValidatesAgainstServerDefinitionsAndEncryptsBeforeStorage() {
        service.save(new PluginParameterSaveRequest(PLUGIN_ID, List.of(
                new PluginParameterInput("endpoint", "https://x.test", null),
                new PluginParameterInput("token", "new-secret", PasswordIntent.REPLACE),
                new PluginParameterInput("retries", "3", null))));

        ArgumentCaptor<List<PluginParam>> saved = ArgumentCaptor.forClass(List.class);
        InOrder order = inOrder(pluginParamDao);
        order.verify(pluginParamDao).deletePluginParamsByPluginMetadataId(PLUGIN_ID);
        order.verify(pluginParamDao).flush();
        order.verify(pluginParamDao).saveAll(saved.capture());
        PluginParam token = saved.getValue().stream().filter(param -> "token".equals(param.getField())).findFirst().orElseThrow();
        assertEquals(CommonConstants.PARAM_TYPE_PASSWORD, token.getType());
        assertFalse("new-secret".equals(token.getParamValue()));
        assertEquals("new-secret", AesUtil.aesDecode(token.getParamValue()));
        assertEquals(CommonConstants.PARAM_TYPE_NUMBER, saved.getValue().stream()
                .filter(param -> "retries".equals(param.getField())).findFirst().orElseThrow().getType());
        assertEquals(saved.getValue(), registry.storedParameters(PLUGIN_ID));
    }

    @Test
    void keepPreservesExistingCiphertextWithoutAcceptingPlaceholderValues() {
        String ciphertext = AesUtil.aesEncode("existing-secret");
        when(pluginParamDao.findParamsByPluginMetadataId(PLUGIN_ID)).thenReturn(List.of(
                stored("endpoint", "old", CommonConstants.PARAM_TYPE_STRING),
                stored("token", ciphertext, CommonConstants.PARAM_TYPE_PASSWORD)));

        service.save(new PluginParameterSaveRequest(PLUGIN_ID, List.of(
                new PluginParameterInput("endpoint", "new", null),
                new PluginParameterInput("token", null, PasswordIntent.KEEP),
                new PluginParameterInput("retries", "2", null))));

        ArgumentCaptor<List<PluginParam>> saved = ArgumentCaptor.forClass(List.class);
        verify(pluginParamDao).saveAll(saved.capture());
        assertEquals(ciphertext, saved.getValue().stream()
                .filter(param -> "token".equals(param.getField())).findFirst().orElseThrow().getParamValue());

        assertThrows(IllegalArgumentException.class, () -> service.save(new PluginParameterSaveRequest(
                PLUGIN_ID, List.of(
                        new PluginParameterInput("endpoint", "new", null),
                        new PluginParameterInput("token", "********", PasswordIntent.KEEP),
                        new PluginParameterInput("retries", "2", null)))));

        assertThrows(IllegalArgumentException.class, () -> service.save(new PluginParameterSaveRequest(
                PLUGIN_ID, List.of(
                        new PluginParameterInput("endpoint", "new", null),
                        new PluginParameterInput("token", "", PasswordIntent.KEEP),
                        new PluginParameterInput("retries", "2", null)))));
    }

    @Test
    void keepReencryptsLegacyPlaintextInsteadOfPersistingItAgain() {
        when(pluginParamDao.findParamsByPluginMetadataId(PLUGIN_ID)).thenReturn(List.of(
                stored("token", "legacy-plaintext", CommonConstants.PARAM_TYPE_PASSWORD)));

        service.save(new PluginParameterSaveRequest(PLUGIN_ID, List.of(
                new PluginParameterInput("endpoint", "new", null),
                new PluginParameterInput("token", null, PasswordIntent.KEEP),
                new PluginParameterInput("retries", "2", null))));

        ArgumentCaptor<List<PluginParam>> saved = ArgumentCaptor.forClass(List.class);
        verify(pluginParamDao).saveAll(saved.capture());
        String protectedValue = saved.getValue().stream()
                .filter(param -> "token".equals(param.getField())).findFirst().orElseThrow().getParamValue();
        assertTrue(AesUtil.isCiphertext(protectedValue));
        assertEquals("legacy-plaintext", AesUtil.aesDecode(protectedValue));
    }

    @Test
    void refusesPasswordPersistenceWhenEncryptionCannotProduceCiphertext(CapturedOutput output) {
        String previousKey = AesUtil.getDefaultSecretKey();
        AesUtil.setDefaultSecretKey("invalid-key");
        try {
            assertThrows(IllegalArgumentException.class, () -> service.save(new PluginParameterSaveRequest(
                    PLUGIN_ID, List.of(
                            new PluginParameterInput("endpoint", "new", null),
                            new PluginParameterInput("token", "must-not-persist", PasswordIntent.REPLACE),
                            new PluginParameterInput("retries", "2", null)))));
            verify(pluginParamDao, never()).saveAll(anyList());
            assertFalse(output.getAll().contains("must-not-persist"));
        } finally {
            AesUtil.setDefaultSecretKey(previousKey);
        }
    }

    @Test
    void rollbackWithoutAfterCommitNeverPublishesUncommittedRuntimeState() {
        registry.replaceStoredParameters(PLUGIN_ID, List.of(
                stored("endpoint", "old-runtime", CommonConstants.PARAM_TYPE_STRING),
                stored("token", AesUtil.aesEncode("old-secret"), CommonConstants.PARAM_TYPE_PASSWORD),
                stored("retries", "2", CommonConstants.PARAM_TYPE_NUMBER)));
        when(pluginParamDao.findParamsByPluginMetadataId(PLUGIN_ID)).thenReturn(List.of(
                stored("token", AesUtil.aesEncode("old-secret"), CommonConstants.PARAM_TYPE_PASSWORD)));
        TransactionSynchronizationManager.initSynchronization();
        try {
            service.save(new PluginParameterSaveRequest(PLUGIN_ID, List.of(
                    new PluginParameterInput("endpoint", "new-runtime", null),
                    new PluginParameterInput("token", "new-secret", PasswordIntent.REPLACE),
                    new PluginParameterInput("retries", "3", null))));

            assertEquals("old-runtime", registry.runtimeContext(PLUGIN_ID).param().getString("endpoint", null));
            assertEquals("old-secret", registry.runtimeContext(PLUGIN_ID).param().getString("token", null));
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
        assertEquals("old-runtime", registry.runtimeContext(PLUGIN_ID).param().getString("endpoint", null));
    }

    @Test
    void successfulCommitPublishesValidatedRuntimeState() {
        when(pluginParamDao.findParamsByPluginMetadataId(PLUGIN_ID)).thenReturn(List.of());
        TransactionSynchronizationManager.initSynchronization();
        try {
            service.save(new PluginParameterSaveRequest(PLUGIN_ID, List.of(
                    new PluginParameterInput("endpoint", "committed", null),
                    new PluginParameterInput("token", "committed-secret", PasswordIntent.REPLACE),
                    new PluginParameterInput("retries", "3", null))));
            assertNull(registry.runtimeContext(PLUGIN_ID).param().getString("endpoint", null));

            TransactionSynchronizationManager.getSynchronizations()
                    .forEach(synchronization -> synchronization.afterCommit());
            assertEquals("committed", registry.runtimeContext(PLUGIN_ID).param().getString("endpoint", null));
            assertEquals("committed-secret", registry.runtimeContext(PLUGIN_ID).param().getString("token", null));
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void rolledBackDeleteRetainsDefinitionAndRuntimeState() {
        registry.replaceStoredParameters(PLUGIN_ID, List.of(
                stored("endpoint", "still-present", CommonConstants.PARAM_TYPE_STRING)));
        TransactionSynchronizationManager.initSynchronization();
        try {
            service.deleteByPluginIds(Set.of(PLUGIN_ID));
            assertTrue(registry.definition(PLUGIN_ID).isPresent());
            assertEquals("still-present", registry.runtimeContext(PLUGIN_ID).param().getString("endpoint", null));
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
        assertTrue(registry.definition(PLUGIN_ID).isPresent());
        assertEquals("still-present", registry.runtimeContext(PLUGIN_ID).param().getString("endpoint", null));
    }

    @Test
    void clearIsAllowedOnlyForOptionalPasswords() {
        PluginConfig optional = pluginConfig();
        optional.getParams().get(1).setRequired(false);
        registry.registerDefinition(PLUGIN_ID, optional);

        service.save(new PluginParameterSaveRequest(PLUGIN_ID, List.of(
                new PluginParameterInput("endpoint", "new", null),
                new PluginParameterInput("token", null, PasswordIntent.CLEAR),
                new PluginParameterInput("retries", "2", null))));

        ArgumentCaptor<List<PluginParam>> saved = ArgumentCaptor.forClass(List.class);
        verify(pluginParamDao).saveAll(saved.capture());
        assertFalse(saved.getValue().stream().anyMatch(param -> "token".equals(param.getField())));

        registry.registerDefinition(PLUGIN_ID, pluginConfig());
        assertThrows(IllegalArgumentException.class, () -> service.save(new PluginParameterSaveRequest(
                PLUGIN_ID, List.of(
                        new PluginParameterInput("endpoint", "new", null),
                        new PluginParameterInput("token", null, PasswordIntent.CLEAR),
                        new PluginParameterInput("retries", "2", null)))));

        optional.getParams().get(1).setRequired(false);
        registry.registerDefinition(PLUGIN_ID, optional);
        assertThrows(IllegalArgumentException.class, () -> service.save(new PluginParameterSaveRequest(
                PLUGIN_ID, List.of(
                        new PluginParameterInput("endpoint", "new", null),
                        new PluginParameterInput("token", "", PasswordIntent.CLEAR),
                        new PluginParameterInput("retries", "2", null)))));
    }

    @Test
    void rejectsUnknownDuplicateMissingRequiredAndClientPasswordIntentOnPlainFields() {
        assertThrows(IllegalArgumentException.class, () -> service.save(new PluginParameterSaveRequest(
                PLUGIN_ID, List.of(new PluginParameterInput("unknown", "value", null)))));
        assertThrows(IllegalArgumentException.class, () -> service.save(new PluginParameterSaveRequest(
                PLUGIN_ID, List.of(
                        new PluginParameterInput("endpoint", "one", null),
                        new PluginParameterInput("endpoint", "two", null)))));
        assertThrows(IllegalArgumentException.class, () -> service.save(new PluginParameterSaveRequest(
                PLUGIN_ID, List.of(new PluginParameterInput("endpoint", "value", null)))));
        assertThrows(IllegalArgumentException.class, () -> service.save(new PluginParameterSaveRequest(
                PLUGIN_ID, List.of(
                        new PluginParameterInput("endpoint", "value", PasswordIntent.REPLACE),
                        new PluginParameterInput("token", "secret", PasswordIntent.REPLACE),
                        new PluginParameterInput("retries", "2", null)))));
    }

    @Test
    void rejectsUnknownPluginAndDefinitionConstraints() {
        when(metadataDao.existsById(99L)).thenReturn(false);
        assertThrows(IllegalArgumentException.class, () -> service.getParameters(99L));
        assertThrows(IllegalArgumentException.class, () -> service.save(new PluginParameterSaveRequest(
                PLUGIN_ID, List.of(
                        new PluginParameterInput("endpoint", "value-that-exceeds-limit", null),
                        new PluginParameterInput("token", "secret", PasswordIntent.REPLACE),
                        new PluginParameterInput("retries", "9", null)))));
    }

    private static PluginConfig pluginConfig() {
        PluginConfig config = new PluginConfig();
        config.setParams(List.of(
                RuntimeParamDefine.builder().field("endpoint").type("text").required(true).limit((short) 16).build(),
                RuntimeParamDefine.builder().field("token").type("password").required(true)
                        .defaultValue("must-not-leak").placeholder("must-not-leak-either").build(),
                RuntimeParamDefine.builder().field("retries").type("number").required(true).range("[1,5]").build()));
        return config;
    }

    private static PluginParam stored(String field, String value, byte type) {
        return PluginParam.builder().pluginMetadataId(PLUGIN_ID).field(field).paramValue(value).type(type).build();
    }
}
