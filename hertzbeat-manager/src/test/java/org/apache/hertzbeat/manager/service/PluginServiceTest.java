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

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.jar.JarEntry;
import java.util.jar.JarOutputStream;
import org.apache.hertzbeat.common.constants.PluginType;
import org.apache.hertzbeat.common.entity.job.RuntimeParamDefine;
import org.apache.hertzbeat.common.entity.manager.PluginItem;
import org.apache.hertzbeat.common.entity.manager.PluginMetadata;
import org.apache.hertzbeat.common.entity.plugin.PluginConfig;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.manager.dao.PluginItemDao;
import org.apache.hertzbeat.manager.dao.PluginMetadataDao;
import org.apache.hertzbeat.manager.dao.PluginParamDao;
import org.apache.hertzbeat.manager.pojo.dto.PluginUpload;
import org.apache.hertzbeat.manager.pojo.dto.PluginParam;
import org.apache.hertzbeat.manager.pojo.dto.PluginParametersVO;
import org.apache.hertzbeat.manager.service.impl.PluginServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.mock.web.MockMultipartFile;

/**
 * Test case for {@link PluginService}
 */
@ExtendWith(MockitoExtension.class)
class PluginServiceTest {

    @InjectMocks
    private PluginServiceImpl pluginService;

    @Mock
    private PluginMetadataDao metadataDao;

    @Mock
    private PluginParamDao pluginParamDao;

    @Mock
    private PluginItemDao itemDao;


    @BeforeEach
    void setUp() {
        pluginService = new PluginServiceImpl(metadataDao, itemDao, pluginParamDao);
    }

    @Test
    void testSavePlugin(@TempDir File tempDir) throws IOException {

        List<PluginItem> pluginItems = Collections.singletonList(new PluginItem("org.apache.hertzbeat.PluginTest", PluginType.POST_ALERT));
        PluginMetadata metadata = new PluginMetadata();
        metadata.setItems(pluginItems);
        metadata.setParamCount(0);
        PluginServiceImpl service = spy(pluginService);
        doReturn(metadata).when(service).validateJarFile(any());
        File pluginLibDir = new File(tempDir, "plugin-lib");
        String previousPluginLib = System.getProperty("hertzbeat.plugin.lib.dir");
        System.setProperty("hertzbeat.plugin.lib.dir", pluginLibDir.getAbsolutePath());

        MockMultipartFile mockFile = new MockMultipartFile(
                "file", "test-plugin.jar", "application/java-archive",
                "plugin-content".getBytes(StandardCharsets.UTF_8));
        PluginUpload pluginUpload = new PluginUpload(mockFile, "Test Plugin", true);

        when(metadataDao.save(any(PluginMetadata.class))).thenReturn(new PluginMetadata());
        when(itemDao.saveAll(anyList())).thenReturn(Collections.emptyList());

        try {
            service.savePlugin(pluginUpload);
        } finally {
            if (previousPluginLib == null) {
                System.clearProperty("hertzbeat.plugin.lib.dir");
            } else {
                System.setProperty("hertzbeat.plugin.lib.dir", previousPluginLib);
            }
        }
        ArgumentCaptor<File> uploadedJarCaptor = ArgumentCaptor.forClass(File.class);
        ArgumentCaptor<PluginMetadata> metadataCaptor = ArgumentCaptor.forClass(PluginMetadata.class);
        verify(service).validateJarFile(uploadedJarCaptor.capture());
        verify(metadataDao, times(1)).save(metadataCaptor.capture());
        verify(itemDao, times(1)).saveAll(anyList());
        assertTrue(uploadedJarCaptor.getValue().getCanonicalPath().startsWith(pluginLibDir.getCanonicalPath() + File.separator));
        assertNotNull(metadataCaptor.getValue().getJarFilePath());
        assertTrue(new File(metadataCaptor.getValue().getJarFilePath()).getCanonicalPath().startsWith(pluginLibDir.getCanonicalPath() + File.separator));

    }

    @Test
    void testUploadPluginWithInvalidName() {
        MockMultipartFile mockFile = new MockMultipartFile(
            "file", "../test-plugin.jar", "application/java-archive",
            "plugin-content".getBytes(StandardCharsets.UTF_8));
        PluginUpload pluginUpload = new PluginUpload(mockFile, "Test Plugin", true);
        assertThrows(CommonException.class, () -> pluginService.savePlugin(pluginUpload));

        MockMultipartFile mockWindowsFile = new MockMultipartFile(
            "file", "..\\..\\test-plugin.jar", "application/java-archive",
            "plugin-content".getBytes(StandardCharsets.UTF_8));
        PluginUpload pluginUploadWindows = new PluginUpload(mockWindowsFile, "Test Plugin", true);
        assertThrows(CommonException.class, () -> pluginService.savePlugin(pluginUploadWindows));


    }

    @Test
    void testUpdateStatus() {
        PluginMetadata persisted = PluginMetadata.builder()
                .id(1L)
                .name("persisted-plugin")
                .enableStatus(false)
                .jarFilePath("plugin-lib/persisted.jar")
                .items(List.of())
                .build();
        PluginMetadata request = PluginMetadata.builder()
                .id(1L)
                .name("untrusted-name")
                .enableStatus(true)
                .jarFilePath("/untrusted/path.jar")
                .build();

        when(metadataDao.findById(1L)).thenReturn(Optional.of(persisted));
        when(metadataDao.save(any(PluginMetadata.class))).thenReturn(persisted);
        assertDoesNotThrow(() -> pluginService.updateStatus(request));

        verify(metadataDao).save(persisted);
        assertTrue(persisted.getEnableStatus());
        assertEquals("persisted-plugin", persisted.getName());
        assertEquals("plugin-lib/persisted.jar", persisted.getJarFilePath());
    }

    @Test
    void testDeletePlugins() {
        PluginMetadata first = PluginMetadata.builder()
                .id(1L).enableStatus(true).jarFilePath("path/to/plugin-one.jar").items(List.of()).build();
        PluginMetadata second = PluginMetadata.builder()
                .id(2L).enableStatus(true).jarFilePath("path/to/plugin-two.jar").items(List.of()).build();
        Set<Long> ids = new HashSet<>(Set.of(1L, 2L));

        when(metadataDao.findAllById(ids)).thenReturn(List.of(first, second));
        when(metadataDao.findById(1L)).thenReturn(Optional.of(first));
        when(metadataDao.findById(2L)).thenReturn(Optional.of(second));
        doNothing().when(metadataDao).deleteById(1L);
        doNothing().when(metadataDao).deleteById(2L);

        pluginService.deletePlugins(ids);
        verify(metadataDao).deleteById(1L);
        verify(metadataDao).deleteById(2L);
        verify(pluginParamDao).deletePluginParamsByPluginMetadataIdIn(ids);
        assertFalse(first.getEnableStatus());
        assertFalse(second.getEnableStatus());
    }

    @Test
    void testGetPlugins() {
        Page<PluginMetadata> page = new PageImpl<>(Collections.singletonList(new PluginMetadata()));
        when(metadataDao.findAll(any(Specification.class), any(PageRequest.class))).thenReturn(page);
        Page<PluginMetadata> result = pluginService.getPlugins(null, 0, 10);
        assertFalse(result.isEmpty());
        ArgumentCaptor<PageRequest> pageRequest = ArgumentCaptor.forClass(PageRequest.class);
        verify(metadataDao).findAll(any(Specification.class), pageRequest.capture());
        assertEquals(0, pageRequest.getValue().getPageNumber());
        assertEquals(10, pageRequest.getValue().getPageSize());
    }

    @Test
    void testMissingParamDefinitionReturnsArrayShapedResponse() {
        PluginParametersVO result = pluginService.getParamDefine(Long.MAX_VALUE);

        assertNotNull(result.getParamDefines());
        assertNotNull(result.getPluginParams());
        assertTrue(result.getParamDefines().isEmpty());
        assertTrue(result.getPluginParams().isEmpty());
        verifyNoInteractions(pluginParamDao);
    }

    @Test
    @SuppressWarnings("unchecked")
    void testConfiguredParamDefinitionReturnsDefinitionAndSavedValues() throws Exception {
        long pluginId = Long.MAX_VALUE - 1;
        PluginConfig config = new PluginConfig();
        config.setParams(List.of(RuntimeParamDefine.builder().field("endpoint").type("text").build()));
        PluginParam saved = PluginParam.builder()
                .pluginMetadataId(pluginId)
                .field("endpoint")
                .paramValue("https://example.invalid")
                .type((byte) 1)
                .build();
        Field field = PluginServiceImpl.class.getDeclaredField("PARAMS_CONFIG_MAP");
        field.setAccessible(true);
        Map<Long, PluginConfig> configs = (Map<Long, PluginConfig>) field.get(null);
        configs.put(pluginId, config);
        when(pluginParamDao.findParamsByPluginMetadataId(pluginId)).thenReturn(List.of(saved));

        try {
            PluginParametersVO result = pluginService.getParamDefine(pluginId);
            assertEquals("endpoint", result.getParamDefines().get(0).getField());
            assertEquals("text", result.getParamDefines().get(0).getType());
            assertEquals(List.of(saved), result.getPluginParams());
        } finally {
            configs.remove(pluginId);
        }
    }

    @Test
    void testEmptyPluginParamArrayIsNoOp() {
        pluginService.savePluginParam(List.of());

        verifyNoInteractions(pluginParamDao);
    }

    @Test
    void testSavePluginParamFlushesDeleteBeforeInsert() {
        List<org.apache.hertzbeat.manager.pojo.dto.PluginParam> params = List.of(
            org.apache.hertzbeat.manager.pojo.dto.PluginParam.builder()
                .pluginMetadataId(1L)
                .field("endpoint")
                .paramValue("https://example.invalid/hertzbeat-plugin-audit")
                .type((byte) 1)
                .build(),
            org.apache.hertzbeat.manager.pojo.dto.PluginParam.builder()
                .pluginMetadataId(1L)
                .field("mode")
                .paramValue("audit-only")
                .type((byte) 1)
                .build()
        );

        pluginService.savePluginParam(params);

        InOrder inOrder = inOrder(pluginParamDao);
        inOrder.verify(pluginParamDao).deletePluginParamsByPluginMetadataId(1L);
        inOrder.verify(pluginParamDao).flush();
        inOrder.verify(pluginParamDao).saveAll(params);
    }

    @Test
    void testZipSlipDetected(@TempDir File tempDir) throws Exception {
        File maliciousJar = new File(tempDir, "malicious.jar");
        try (JarOutputStream jos = new JarOutputStream(new FileOutputStream(maliciousJar))) {
            JarEntry evilEntry = new JarEntry("../../evil.jar");
            jos.putNextEntry(evilEntry);
            jos.write("malicious-content".getBytes(StandardCharsets.UTF_8));
            jos.closeEntry();
        }
        Method method = PluginServiceImpl.class.getDeclaredMethod(
            "loadLibInPlugin", String.class, Long.class);
        method.setAccessible(true);

        Exception exception = assertThrows(Exception.class, () -> {
            try {
                method.invoke(pluginService, maliciousJar.getAbsolutePath(), 1L);
            } catch (java.lang.reflect.InvocationTargetException e) {
                throw e.getCause();
            }
        });

        assertInstanceOf(IOException.class, exception);
        assertTrue(exception.getMessage().contains("Zip Slip detected"));
    }

}
