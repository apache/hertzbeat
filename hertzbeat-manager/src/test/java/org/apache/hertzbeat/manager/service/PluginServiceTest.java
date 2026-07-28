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
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.jar.JarEntry;
import java.util.jar.JarOutputStream;
import java.util.stream.Stream;
import org.apache.hertzbeat.common.constants.PluginType;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.manager.PluginItem;
import org.apache.hertzbeat.common.entity.manager.PluginMetadata;
import org.apache.hertzbeat.common.entity.plugin.PluginConfig;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.manager.dao.PluginItemDao;
import org.apache.hertzbeat.manager.dao.PluginMetadataDao;
import org.apache.hertzbeat.manager.pojo.dto.PluginUpload;
import org.apache.hertzbeat.manager.service.impl.PluginServiceImpl;
import org.apache.hertzbeat.manager.service.plugin.AfterCommitPublisher;
import org.apache.hertzbeat.manager.service.plugin.PluginArtifactLifecycle;
import org.apache.hertzbeat.manager.service.plugin.PluginParameterRegistry;
import org.apache.hertzbeat.plugin.Plugin;
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
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
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
                metadataDao, itemDao, pluginParameterService, pluginParameterRegistry, new AfterCommitPublisher(),
                new PluginArtifactLifecycle());
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
    void persistenceFailureRemovesUploadedJarAndExtractedLibraries(@TempDir File tempDir) throws IOException {
        PluginMetadata parsed = new PluginMetadata();
        parsed.setItems(List.of(new PluginItem("org.apache.hertzbeat.FailedPlugin", PluginType.POST_ALERT)));
        parsed.setParamCount(0);
        PluginServiceImpl service = spy(pluginService);
        doAnswer(invocation -> {
            File uploaded = invocation.getArgument(0);
            String path = uploaded.getAbsolutePath();
            File extracted = new File(path.substring(0, path.lastIndexOf('.')));
            Files.createDirectories(extracted.toPath());
            Files.write(new File(extracted, "dependency.jar").toPath(), new byte[]{2});
            return parsed;
        }).when(service).validateJarFile(any());
        doThrow(new IllegalStateException("database path /private/db failed"))
                .when(metadataDao).save(any(PluginMetadata.class));
        String previousPluginLib = System.getProperty("hertzbeat.plugin.lib.dir");
        System.setProperty("hertzbeat.plugin.lib.dir", tempDir.getAbsolutePath());
        PluginUpload upload = new PluginUpload(new MockMultipartFile(
                "file", "failed.jar", "application/java-archive", new byte[]{1}), "Failed Plugin", true);

        DataAccessResourceFailureException failure;
        try {
            failure = assertThrows(DataAccessResourceFailureException.class, () -> service.savePlugin(upload));
        } finally {
            if (previousPluginLib == null) {
                System.clearProperty("hertzbeat.plugin.lib.dir");
            } else {
                System.setProperty("hertzbeat.plugin.lib.dir", previousPluginLib);
            }
        }

        assertEquals("Plugin artifact storage unavailable", failure.getMessage());
        assertFalse(failure.getMessage().contains("/private/"));
        try (Stream<java.nio.file.Path> files = Files.list(tempDir.toPath())) {
            assertEquals(0, files.count());
        }
    }

    @Test
    void rejectsBlankPluginNameAtServiceBoundary() {
        PluginUpload upload = new PluginUpload(new MockMultipartFile(
                "file", "blank-name.jar", "application/java-archive", new byte[]{1}), "  ", true);
        assertThrows(IllegalArgumentException.class, () -> pluginService.savePlugin(upload));
    }

    @Test
    void rejectsOversizedPluginBeforeWritingArtifact() throws IOException {
        MultipartFile oversized = mock(MultipartFile.class);
        when(oversized.getOriginalFilename()).thenReturn("oversized.jar");
        when(oversized.getSize()).thenReturn(101L * 1024 * 1024);
        PluginUpload upload = new PluginUpload(oversized, "Oversized Plugin", true);

        assertThrows(IllegalArgumentException.class, () -> pluginService.savePlugin(upload));

        verify(oversized, times(0)).transferTo(any(File.class));
        verify(metadataDao, times(0)).save(any(PluginMetadata.class));
    }

    @Test
    void rejectsEmptyOrNonJarUploadBeforeWritingArtifact() {
        PluginUpload empty = new PluginUpload(new MockMultipartFile(
                "file", "empty.jar", "application/java-archive", new byte[0]), "Empty Plugin", true);
        PluginUpload wrongExtension = new PluginUpload(new MockMultipartFile(
                "file", "plugin.zip", "application/zip", new byte[]{1}), "Wrong Extension", true);

        assertThrows(IllegalArgumentException.class, () -> pluginService.savePlugin(empty));
        assertThrows(IllegalArgumentException.class, () -> pluginService.savePlugin(wrongExtension));

        verify(metadataDao, times(0)).save(any(PluginMetadata.class));
    }

    @Test
    void testUploadPluginWithInvalidName() {
        MockMultipartFile mockFile = new MockMultipartFile(
            "file", "../test-plugin.jar", "application/java-archive",
            "plugin-content".getBytes(StandardCharsets.UTF_8));
        PluginUpload pluginUpload = new PluginUpload(mockFile, "Test Plugin", true);
        assertThrows(IllegalArgumentException.class, () -> pluginService.savePlugin(pluginUpload));

        MockMultipartFile mockWindowsFile = new MockMultipartFile(
            "file", "..\\..\\test-plugin.jar", "application/java-archive",
            "plugin-content".getBytes(StandardCharsets.UTF_8));
        PluginUpload pluginUploadWindows = new PluginUpload(mockWindowsFile, "Test Plugin", true);
        assertThrows(IllegalArgumentException.class, () -> pluginService.savePlugin(pluginUploadWindows));


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

        when(metadataDao.findByIdForUpdate(1L)).thenReturn(Optional.of(persisted));
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
    void testDeletePlugins(@TempDir File tempDir) throws IOException {
        File firstJar = new File(tempDir, "plugin-one.jar");
        File secondJar = new File(tempDir, "plugin-two.jar");
        Files.write(firstJar.toPath(), new byte[]{1});
        Files.write(secondJar.toPath(), new byte[]{2});
        PluginMetadata first = PluginMetadata.builder()
                .id(1L).enableStatus(true).jarFilePath(firstJar.getAbsolutePath()).items(List.of()).build();
        PluginMetadata second = PluginMetadata.builder()
                .id(2L).enableStatus(true).jarFilePath(secondJar.getAbsolutePath()).items(List.of()).build();
        Set<Long> ids = new HashSet<>(Set.of(1L, 2L));

        when(metadataDao.findAllByIdForUpdate(ids)).thenReturn(List.of(first, second));
        doNothing().when(metadataDao).deleteById(1L);
        doNothing().when(metadataDao).deleteById(2L);

        String previousPluginLib = System.getProperty("hertzbeat.plugin.lib.dir");
        System.setProperty("hertzbeat.plugin.lib.dir", tempDir.getAbsolutePath());
        TransactionSynchronizationManager.initSynchronization();
        try {
            pluginService.deletePlugins(ids);
            assertTrue(firstJar.exists());
            assertTrue(secondJar.exists());
            TransactionSynchronizationManager.getSynchronizations()
                    .forEach(TransactionSynchronization::afterCommit);
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
            if (previousPluginLib == null) {
                System.clearProperty("hertzbeat.plugin.lib.dir");
            } else {
                System.setProperty("hertzbeat.plugin.lib.dir", previousPluginLib);
            }
        }
        verify(metadataDao).deleteById(1L);
        verify(metadataDao).deleteById(2L);
        verify(pluginParameterService).deleteByPluginIds(ids);
        assertFalse(first.getEnableStatus());
        assertFalse(second.getEnableStatus());
    }

    @Test
    void emptyBatchDeleteIsRejectedBeforeDatabaseAccess() {
        assertThrows(IllegalArgumentException.class, () -> pluginService.deletePlugins(Set.of()));
        verify(metadataDao, times(0)).findAllByIdForUpdate(any());
    }

    @Test
    void missingBatchDeleteTargetRejectsWholeMutation(@TempDir File tempDir) throws IOException {
        File jar = new File(tempDir, "only-existing.jar");
        Files.write(jar.toPath(), new byte[]{1});
        PluginMetadata existing = PluginMetadata.builder()
                .id(1L).enableStatus(true).jarFilePath(jar.getAbsolutePath()).items(List.of()).build();
        Set<Long> requested = Set.of(1L, 2L);
        when(metadataDao.findAllByIdForUpdate(requested)).thenReturn(List.of(existing));
        String previousPluginLib = System.getProperty("hertzbeat.plugin.lib.dir");
        System.setProperty("hertzbeat.plugin.lib.dir", tempDir.getAbsolutePath());
        TransactionSynchronizationManager.initSynchronization();

        try {
            assertThrows(NoSuchElementException.class, () -> pluginService.deletePlugins(requested));
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
            if (previousPluginLib == null) {
                System.clearProperty("hertzbeat.plugin.lib.dir");
            } else {
                System.setProperty("hertzbeat.plugin.lib.dir", previousPluginLib);
            }
        }

        verify(metadataDao, times(0)).deleteById(any(Long.class));
        verify(pluginParameterService, times(0)).deleteByPluginIds(any());
        assertTrue(existing.getEnableStatus());
        assertTrue(jar.exists());
    }

    @Test
    void statusAndDeleteUseLockedTargetLookups() {
        assertDoesNotThrow(() -> PluginMetadataDao.class.getMethod("findByIdForUpdate", Long.class));
        assertDoesNotThrow(() -> PluginMetadataDao.class.getMethod("findAllByIdForUpdate", Set.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    void committedDeleteClosesRuntimeBeforeRemovingManagedArtifacts(@TempDir File tempDir) throws Exception {
        File jar = new File(tempDir, "managed.jar");
        Files.write(jar.toPath(), new byte[]{1});
        File extracted = new File(tempDir, "managed");
        Files.createDirectories(extracted.toPath());
        PluginMetadata plugin = PluginMetadata.builder()
                .id(73L).enableStatus(true).jarFilePath(jar.getAbsolutePath()).items(List.of()).build();
        when(metadataDao.findAllByIdForUpdate(Set.of(73L))).thenReturn(List.of(plugin));
        when(metadataDao.findPluginMetadataByEnableStatusTrue()).thenReturn(List.of());
        Field loadersField = PluginServiceImpl.class.getDeclaredField("pluginClassLoaders");
        loadersField.setAccessible(true);
        List<URLClassLoader> loaders = (List<URLClassLoader>) loadersField.get(pluginService);
        BlockingClassLoader blockingLoader = new BlockingClassLoader();
        loaders.add(blockingLoader);
        String previousPluginLib = System.getProperty("hertzbeat.plugin.lib.dir");
        System.setProperty("hertzbeat.plugin.lib.dir", tempDir.getAbsolutePath());
        TransactionSynchronizationManager.initSynchronization();
        ExecutorService executor = Executors.newSingleThreadExecutor();

        try {
            pluginService.deletePlugins(Set.of(73L));
            assertTrue(jar.exists());
            assertTrue(extracted.exists());
            List<TransactionSynchronization> synchronizations =
                    TransactionSynchronizationManager.getSynchronizations();
            Future<?> completion = executor.submit(
                    () -> synchronizations.forEach(TransactionSynchronization::afterCommit));
            assertTrue(blockingLoader.closeEntered.await(5, TimeUnit.SECONDS));
            assertTrue(jar.exists());
            assertTrue(extracted.exists());
            blockingLoader.allowClose.countDown();
            completion.get(5, TimeUnit.SECONDS);
            assertFalse(jar.exists());
            assertFalse(extracted.exists());
        } finally {
            blockingLoader.allowClose.countDown();
            executor.shutdownNow();
            TransactionSynchronizationManager.clearSynchronization();
            if (previousPluginLib == null) {
                System.clearProperty("hertzbeat.plugin.lib.dir");
            } else {
                System.setProperty("hertzbeat.plugin.lib.dir", previousPluginLib);
            }
        }
    }

    @Test
    void committedDeleteCleansArtifactsWhenRuntimeConvergenceFails(@TempDir File tempDir) throws IOException {
        File jar = new File(tempDir, "convergence-failure.jar");
        Files.write(jar.toPath(), new byte[]{1});
        PluginMetadata plugin = PluginMetadata.builder()
                .id(75L).enableStatus(true).jarFilePath(jar.getAbsolutePath()).items(List.of()).build();
        when(metadataDao.findAllByIdForUpdate(Set.of(75L))).thenReturn(List.of(plugin));
        when(metadataDao.findPluginMetadataByEnableStatusTrue())
                .thenThrow(new IllegalStateException("raw token and /private/runtime/path"));
        String previousPluginLib = System.getProperty("hertzbeat.plugin.lib.dir");
        System.setProperty("hertzbeat.plugin.lib.dir", tempDir.getAbsolutePath());
        TransactionSynchronizationManager.initSynchronization();

        try {
            pluginService.deletePlugins(Set.of(75L));
            List<TransactionSynchronization> synchronizations =
                    TransactionSynchronizationManager.getSynchronizations();
            assertDoesNotThrow(() -> synchronizations.forEach(TransactionSynchronization::afterCommit));
            assertFalse(jar.exists());
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
            if (previousPluginLib == null) {
                System.clearProperty("hertzbeat.plugin.lib.dir");
            } else {
                System.setProperty("hertzbeat.plugin.lib.dir", previousPluginLib);
            }
        }
    }

    @Test
    void outsideDeletePathIsRejectedBeforeDatabaseMutation(@TempDir File tempDir) throws IOException {
        File root = new File(tempDir, "plugin-root");
        File outside = new File(tempDir, "external-token.jar");
        Files.write(outside.toPath(), new byte[]{1});
        PluginMetadata plugin = PluginMetadata.builder()
                .id(74L).enableStatus(true).jarFilePath(outside.getAbsolutePath()).items(List.of()).build();
        when(metadataDao.findAllByIdForUpdate(Set.of(74L))).thenReturn(List.of(plugin));
        String previousPluginLib = System.getProperty("hertzbeat.plugin.lib.dir");
        System.setProperty("hertzbeat.plugin.lib.dir", root.getAbsolutePath());

        try {
            CommonException failure = assertThrows(CommonException.class,
                    () -> pluginService.deletePlugins(Set.of(74L)));
            assertEquals("Plugin artifact path is invalid", failure.getMessage());
            assertFalse(failure.getMessage().contains(outside.getAbsolutePath()));
        } finally {
            if (previousPluginLib == null) {
                System.clearProperty("hertzbeat.plugin.lib.dir");
            } else {
                System.setProperty("hertzbeat.plugin.lib.dir", previousPluginLib);
            }
        }
        assertTrue(outside.exists());
        verify(metadataDao, times(0)).deleteById(74L);
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
        when(metadataDao.findByIdForUpdate(71L)).thenReturn(Optional.of(plugin));
        pluginService.updateStatus(plugin);
        pluginParameterRegistry.registerDefinition(71L, new PluginConfig());
        when(metadataDao.findAllByIdForUpdate(Set.of(71L))).thenReturn(List.of(plugin));
        String previousPluginLib = System.getProperty("hertzbeat.plugin.lib.dir");
        System.setProperty("hertzbeat.plugin.lib.dir", tempDir.getAbsolutePath());

        TransactionSynchronizationManager.initSynchronization();
        try {
            pluginService.deletePlugins(Set.of(71L));
            assertTrue(pluginService.pluginIsEnable(RollbackMarker.class));
            assertTrue(pluginParameterRegistry.definition(71L).isPresent());
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
            if (previousPluginLib == null) {
                System.clearProperty("hertzbeat.plugin.lib.dir");
            } else {
                System.setProperty("hertzbeat.plugin.lib.dir", previousPluginLib);
            }
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
        when(metadataDao.findByIdForUpdate(72L)).thenReturn(Optional.of(persisted));
        when(metadataDao.findPluginMetadataByEnableStatusTrue()).thenReturn(List.of(persisted));
        String previousPluginLib = System.getProperty("hertzbeat.plugin.lib.dir");
        System.setProperty("hertzbeat.plugin.lib.dir", tempDir.getAbsolutePath());
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
            if (previousPluginLib == null) {
                System.clearProperty("hertzbeat.plugin.lib.dir");
            } else {
                System.setProperty("hertzbeat.plugin.lib.dir", previousPluginLib);
            }
        }
    }

    @Test
    @SuppressWarnings("unchecked")
    void executionWaitsWhileReloadClosesClassloaders() throws Exception {
        Field loadersField = PluginServiceImpl.class.getDeclaredField("pluginClassLoaders");
        loadersField.setAccessible(true);
        List<URLClassLoader> loaders = (List<URLClassLoader>) loadersField.get(pluginService);
        BlockingClassLoader blockingLoader = new BlockingClassLoader();
        loaders.add(blockingLoader);
        when(metadataDao.findPluginMetadataByEnableStatusTrue()).thenReturn(List.of());
        Method reload = PluginServiceImpl.class.getDeclaredMethod("loadJarToClassLoader");
        reload.setAccessible(true);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            Future<?> reloadFuture = executor.submit(() -> {
                try {
                    reload.invoke(pluginService);
                } catch (ReflectiveOperationException exception) {
                    throw new IllegalStateException(exception);
                }
            });
            assertTrue(blockingLoader.closeEntered.await(5, TimeUnit.SECONDS));
            Future<?> executeFuture = executor.submit(
                    () -> pluginService.pluginExecute(Plugin.class, plugin -> { }));
            assertThrows(TimeoutException.class, () -> executeFuture.get(200, TimeUnit.MILLISECONDS));

            blockingLoader.allowClose.countDown();
            reloadFuture.get(5, TimeUnit.SECONDS);
            executeFuture.get(5, TimeUnit.SECONDS);
        } finally {
            blockingLoader.allowClose.countDown();
            executor.shutdownNow();
        }
    }

    @Test
    @SuppressWarnings("unchecked")
    void reloadWaitsUntilActivePluginCallbackCompletes(@TempDir File tempDir) throws Exception {
        File providerJar = new File(tempDir, "callback-provider.jar");
        try (JarOutputStream output = new JarOutputStream(new FileOutputStream(providerJar))) {
            output.putNextEntry(new JarEntry("META-INF/services/" + Plugin.class.getName()));
            output.write(CallbackPlugin.class.getName().getBytes(StandardCharsets.UTF_8));
            output.closeEntry();
        }
        Field loadersField = PluginServiceImpl.class.getDeclaredField("pluginClassLoaders");
        loadersField.setAccessible(true);
        List<URLClassLoader> loaders = (List<URLClassLoader>) loadersField.get(pluginService);
        BlockingClassLoader blockingLoader = new BlockingClassLoader(
                new URL[]{providerJar.toURI().toURL()});
        loaders.add(blockingLoader);
        Field statusesField = PluginServiceImpl.class.getDeclaredField("PLUGIN_ENABLE_STATUS");
        statusesField.setAccessible(true);
        Map<String, Boolean> statuses = (Map<String, Boolean>) statusesField.get(null);
        statuses.put(CallbackPlugin.class.getName(), true);
        when(metadataDao.findPluginMetadataByEnableStatusTrue()).thenReturn(List.of());
        Method reload = PluginServiceImpl.class.getDeclaredMethod("loadJarToClassLoader");
        reload.setAccessible(true);
        CountDownLatch callbackEntered = new CountDownLatch(1);
        CountDownLatch allowCallback = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            Future<?> execution = executor.submit(() -> pluginService.pluginExecute(Plugin.class, plugin -> {
                callbackEntered.countDown();
                try {
                    allowCallback.await();
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException("Plugin callback interrupted");
                }
            }));
            assertTrue(callbackEntered.await(5, TimeUnit.SECONDS));
            Future<?> reloadFuture = executor.submit(() -> {
                try {
                    reload.invoke(pluginService);
                } catch (ReflectiveOperationException exception) {
                    throw new IllegalStateException(exception);
                }
            });

            assertFalse(blockingLoader.closeEntered.await(200, TimeUnit.MILLISECONDS));
            allowCallback.countDown();
            execution.get(5, TimeUnit.SECONDS);
            assertTrue(blockingLoader.closeEntered.await(5, TimeUnit.SECONDS));
            blockingLoader.allowClose.countDown();
            reloadFuture.get(5, TimeUnit.SECONDS);
        } finally {
            allowCallback.countDown();
            blockingLoader.allowClose.countDown();
            statuses.remove(CallbackPlugin.class.getName());
            executor.shutdownNow();
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
        assertEquals("Invalid plugin archive entry", exception.getMessage());
    }

    private static final class RollbackMarker {
    }

    private static final class BlockingClassLoader extends URLClassLoader {

        private final CountDownLatch closeEntered = new CountDownLatch(1);

        private final CountDownLatch allowClose = new CountDownLatch(1);

        private BlockingClassLoader() {
            this(new URL[0]);
        }

        private BlockingClassLoader(URL[] urls) {
            super(urls, Plugin.class.getClassLoader());
        }

        @Override
        public void close() throws IOException {
            closeEntered.countDown();
            try {
                allowClose.await();
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new IOException("Interrupted while closing plugin classloader");
            }
            super.close();
        }
    }

    public static final class CallbackPlugin implements Plugin {

        @Override
        public void alert(GroupAlert alert) {
            // No-op test provider.
        }
    }

}
