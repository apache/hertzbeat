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
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
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
import java.util.Optional;
import java.util.Set;
import java.util.jar.JarEntry;
import java.util.jar.JarOutputStream;
import org.apache.hertzbeat.common.constants.PluginType;
import org.apache.hertzbeat.common.entity.manager.PluginItem;
import org.apache.hertzbeat.common.entity.manager.PluginMetadata;
import org.apache.hertzbeat.common.entity.plugin.PluginConfig;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.manager.dao.PluginItemDao;
import org.apache.hertzbeat.manager.dao.PluginMetadataDao;
import org.apache.hertzbeat.manager.pojo.dto.PluginUpload;
import org.apache.hertzbeat.manager.service.impl.PluginServiceImpl;
import org.apache.hertzbeat.manager.service.plugin.AfterCommitPublisher;
import org.apache.hertzbeat.manager.service.plugin.PluginParameterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionSynchronizationManager;

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
    private PluginParameterService pluginParameterService;

    @Mock
    private PluginItemDao itemDao;

    private PluginParameterRegistry pluginParameterRegistry;

    @BeforeEach
    void setUp() {
        pluginParameterRegistry = new PluginParameterRegistry();
        pluginService = new PluginServiceImpl(
                metadataDao, itemDao, pluginParameterService, pluginParameterRegistry, new AfterCommitPublisher());
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
    void testSaveDisabledPluginPreservesRequestedStatus(@TempDir File tempDir) throws IOException {
        PluginMetadata parsed = new PluginMetadata();
        parsed.setItems(List.of(new PluginItem("org.apache.hertzbeat.DisabledPlugin", PluginType.POST_ALERT)));
        parsed.setParamCount(0);
        PluginServiceImpl service = spy(pluginService);
        doReturn(parsed).when(service).validateJarFile(any());
        String previousPluginLib = System.getProperty("hertzbeat.plugin.lib.dir");
        System.setProperty("hertzbeat.plugin.lib.dir", tempDir.getAbsolutePath());
        PluginUpload upload = new PluginUpload(new MockMultipartFile(
                "file", "disabled.jar", "application/java-archive", new byte[]{1}), "Disabled Plugin", false);

        try {
            service.savePlugin(upload);
        } finally {
            if (previousPluginLib == null) {
                System.clearProperty("hertzbeat.plugin.lib.dir");
            } else {
                System.setProperty("hertzbeat.plugin.lib.dir", previousPluginLib);
            }
        }

        ArgumentCaptor<PluginMetadata> saved = ArgumentCaptor.forClass(PluginMetadata.class);
        verify(metadataDao).save(saved.capture());
        assertFalse(saved.getValue().getEnableStatus());
    }

    @Test
    void rejectsBlankPluginNameAtServiceBoundary() {
        PluginUpload upload = new PluginUpload(new MockMultipartFile(
                "file", "blank-name.jar", "application/java-archive", new byte[]{1}), "  ", true);
        assertThrows(CommonException.class, () -> pluginService.savePlugin(upload));
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
    void rejectsIncompleteStatusRequestsAtServiceBoundary() {
        assertThrows(IllegalArgumentException.class, () -> pluginService.updateStatus(null));
        assertThrows(IllegalArgumentException.class,
                () -> pluginService.updateStatus(PluginMetadata.builder().enableStatus(true).build()));
        assertThrows(IllegalArgumentException.class,
                () -> pluginService.updateStatus(PluginMetadata.builder().id(1L).build()));
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
        verify(pluginParameterService).deleteByPluginIds(ids);
        assertFalse(first.getEnableStatus());
        assertFalse(second.getEnableStatus());
    }

    @Test
    void rolledBackDeleteDoesNotPublishRegistryClassloaderOrStatusChanges(@TempDir File tempDir) {
        PluginItem item = new PluginItem(RollbackMarker.class.getName(), PluginType.POST_ALERT);
        PluginMetadata plugin = PluginMetadata.builder()
                .id(71L)
                .enableStatus(true)
                .jarFilePath(new File(tempDir, "missing-plugin.jar").getAbsolutePath())
                .items(List.of(item))
                .build();
        when(metadataDao.findById(71L)).thenReturn(Optional.of(plugin));
        pluginService.updateStatus(plugin);
        pluginParameterRegistry.registerDefinition(71L, new PluginConfig());
        when(metadataDao.findAllById(Set.of(71L))).thenReturn(List.of(plugin));

        TransactionSynchronizationManager.initSynchronization();
        try {
            pluginService.deletePlugins(Set.of(71L));
            assertTrue(pluginService.pluginIsEnable(RollbackMarker.class));
            assertTrue(pluginParameterRegistry.definition(71L).isPresent());
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
        assertTrue(pluginService.pluginIsEnable(RollbackMarker.class));
        assertTrue(pluginParameterRegistry.definition(71L).isPresent());
    }

    @Test
    @SuppressWarnings("unchecked")
    void enablingPluginReloadsRuntimeOnlyAfterCommit(@TempDir File tempDir) throws Exception {
        File jar = new File(tempDir, "enable-plugin.jar");
        try (JarOutputStream output = new JarOutputStream(new FileOutputStream(jar))) {
            output.putNextEntry(new JarEntry("define/plugin-define.yml"));
            output.write("params:\n  - field: token\n    type: password\n".getBytes(StandardCharsets.UTF_8));
            output.closeEntry();
        }
        PluginItem item = new PluginItem(RollbackMarker.class.getName(), PluginType.POST_ALERT);
        PluginMetadata persisted = PluginMetadata.builder()
                .id(72L).enableStatus(false).jarFilePath(jar.getAbsolutePath()).items(List.of(item)).build();
        PluginMetadata request = PluginMetadata.builder().id(72L).enableStatus(true).build();
        when(metadataDao.findById(72L)).thenReturn(Optional.of(persisted));
        when(metadataDao.findPluginMetadataByEnableStatusTrue()).thenReturn(List.of(persisted));
        Field loadersField = PluginServiceImpl.class.getDeclaredField("pluginClassLoaders");
        loadersField.setAccessible(true);
        List<?> loaders = (List<?>) loadersField.get(pluginService);
        int initialLoaderCount = loaders.size();

        TransactionSynchronizationManager.initSynchronization();
        try {
            pluginService.updateStatus(request);
            assertFalse(pluginService.pluginIsEnable(RollbackMarker.class));
            assertTrue(pluginParameterRegistry.definition(72L).isEmpty());
            assertEquals(initialLoaderCount, loaders.size());

            TransactionSynchronizationManager.getSynchronizations()
                    .forEach(synchronization -> synchronization.afterCommit());
            assertTrue(pluginService.pluginIsEnable(RollbackMarker.class));
            assertTrue(pluginParameterRegistry.definition(72L).isPresent());
            assertEquals(initialLoaderCount + 1, loaders.size());
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
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

    private static final class RollbackMarker {
    }

}
