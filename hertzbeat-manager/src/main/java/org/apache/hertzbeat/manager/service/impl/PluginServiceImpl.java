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

import jakarta.annotation.PostConstruct;
import jakarta.persistence.criteria.Predicate;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLClassLoader;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.ServiceLoader;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantReadWriteLock;
import java.util.function.BiConsumer;
import java.util.function.Consumer;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.io.FileUtils;
import org.apache.hertzbeat.common.constants.PluginType;
import org.apache.hertzbeat.common.entity.manager.PluginItem;
import org.apache.hertzbeat.common.entity.manager.PluginMetadata;
import org.apache.hertzbeat.common.entity.plugin.PluginConfig;
import org.apache.hertzbeat.common.entity.plugin.PluginContext;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.manager.dao.PluginItemDao;
import org.apache.hertzbeat.manager.dao.PluginMetadataDao;
import org.apache.hertzbeat.manager.pojo.dto.PluginUpload;
import org.apache.hertzbeat.manager.service.PluginParameterService;
import org.apache.hertzbeat.manager.service.PluginService;
import org.apache.hertzbeat.manager.service.plugin.AfterCommitPublisher;
import org.apache.hertzbeat.manager.service.plugin.PluginArtifactLifecycle;
import org.apache.hertzbeat.manager.service.plugin.PluginParameterRegistry;
import org.apache.hertzbeat.plugin.PostAlertPlugin;
import org.apache.hertzbeat.plugin.Plugin;
import org.apache.hertzbeat.plugin.PostCollectPlugin;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.error.YAMLException;

/**
 * plugin service
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PluginServiceImpl implements PluginService {

    private static final long MAX_PLUGIN_UPLOAD_BYTES = 100L * 1024 * 1024;

    private final PluginMetadataDao metadataDao;

    private final PluginItemDao itemDao;

    private final PluginParameterService pluginParameterService;

    private final PluginParameterRegistry pluginParameterRegistry;

    private final AfterCommitPublisher afterCommitPublisher;

    private final PluginArtifactLifecycle pluginArtifactLifecycle;

    public static Map<Class<?>, PluginType> PLUGIN_TYPE_MAPPING = new HashMap<>();

    /**
     * plugin status
     */
    private static final Map<String, Boolean> PLUGIN_ENABLE_STATUS = new ConcurrentHashMap<>();

    /**
     * pluginItem Mapping pluginId
     */
    private static final Map<String, Long> ITEM_TO_PLUGINMETADATAID_MAP = new ConcurrentHashMap<>();

    private final List<URLClassLoader> pluginClassLoaders = new ArrayList<>();

    private final ReentrantReadWriteLock pluginClassLoaderLock = new ReentrantReadWriteLock();

    @Override
    @Transactional
    public void deletePlugins(Set<Long> ids) {
        if (ids == null || ids.isEmpty() || ids.stream().anyMatch(id -> id == null)) {
            throw new IllegalArgumentException("Plugin ids are required");
        }
        Set<Long> pluginIds = Set.copyOf(ids);
        List<PluginMetadata> plugins = metadataDao.findAllByIdForUpdate(pluginIds);
        if (plugins.size() != pluginIds.size()) {
            throw new NoSuchElementException("Plugin delete target is missing");
        }
        PluginArtifactLifecycle.Deletion artifactDeletion = pluginArtifactLifecycle.prepareDeletion(
                plugins.stream().map(PluginMetadata::getJarFilePath).toList());
        // The locked entities are already the authoritative delete targets.
        // Mark them disabled without querying and locking every row a second time.
        for (PluginMetadata plugin : plugins) {
            plugin.setEnableStatus(false);
        }
        plugins.forEach(plugin -> metadataDao.deleteById(plugin.getId()));
        afterCommitPublisher.publish(() -> completeDeletedPlugins(pluginIds, artifactDeletion));
        pluginParameterService.deleteByPluginIds(pluginIds);

    }

    private void completeDeletedPlugins(Set<Long> ids, PluginArtifactLifecycle.Deletion artifactDeletion) {
        try {
            loadJarToClassLoader();
        } catch (RuntimeException exception) {
            log.error("Failed to reload plugin runtime after committed deletion");
        }
        try {
            ids.forEach(pluginParameterRegistry::remove);
        } catch (RuntimeException exception) {
            log.error("Failed to remove committed plugin parameter state");
        }
        try {
            syncPluginStatus();
        } catch (RuntimeException exception) {
            log.error("Failed to converge plugin status after committed deletion");
        }
        pluginArtifactLifecycle.deleteCommitted(artifactDeletion);
    }

    /**
     * get the directory where the JAR files dependent on the plugin are saved
     *
     * @param pluginJarPath jar file path
     * @return lib dir
     */
    private String getOtherLibDir(String pluginJarPath) {
        return pluginJarPath.substring(0, pluginJarPath.lastIndexOf("."));
    }

    @Override
    @Transactional
    public void updateStatus(PluginMetadata plugin) {
        if (plugin == null || plugin.getId() == null || plugin.getEnableStatus() == null) {
            throw new IllegalArgumentException("Plugin id and enable status are required");
        }
        Optional<PluginMetadata> pluginMetadata = metadataDao.findByIdForUpdate(plugin.getId());
        if (pluginMetadata.isPresent()) {
            PluginMetadata metadata = pluginMetadata.get();
            metadata.setEnableStatus(plugin.getEnableStatus());
            metadataDao.save(metadata);
            afterCommitPublisher.publish(() -> syncSinglePluginStatus(metadata));
            afterCommitPublisher.publish(this::loadJarToClassLoader);
        } else {
            throw new NoSuchElementException("The plugin is not existed");
        }
    }

    static {
        PLUGIN_TYPE_MAPPING.put(Plugin.class, PluginType.POST_ALERT);
        PLUGIN_TYPE_MAPPING.put(PostAlertPlugin.class, PluginType.POST_ALERT);
        PLUGIN_TYPE_MAPPING.put(PostCollectPlugin.class, PluginType.POST_COLLECT);
    }

    /**
     * verify the type of the jar package
     *
     * @param jarFile jar file
     * @return return the result of jar package parsed
     */
    public PluginMetadata validateJarFile(File jarFile) {
        PluginMetadata metadata = new PluginMetadata();
        List<PluginItem> pluginItems = new ArrayList<>();
        AtomicInteger pluginImplementationCount = new AtomicInteger(0);
        try {
            validateFilePath(jarFile);
            URL jarUrl = new URL("file:" + jarFile.getAbsolutePath());
            validateJarUrl(jarUrl);
            try (URLClassLoader classLoader = new URLClassLoader(new URL[]{jarUrl}, this.getClass().getClassLoader());
                JarFile jar = new JarFile(jarFile)) {
                Enumeration<JarEntry> entries = jar.entries();
                while (entries.hasMoreElements()) {
                    JarEntry entry = entries.nextElement();
                    if (entry.getName().endsWith(".class")) {
                        String className = entry.getName().replace("/", ".").replace(".class", "");
                        try {
                            Class<?> cls = classLoader.loadClass(className);
                            if (cls.isInterface()) {
                                continue;
                            }
                            if (pluginImplementationCount.get() >= 1) {
                                throw new CommonException("A plugin package can only contain one plugin implementation class");
                            }
                            PLUGIN_TYPE_MAPPING.forEach((clazz, type) -> {
                                if (clazz.isAssignableFrom(cls)) {
                                    pluginItems.add(new PluginItem(className, type));
                                    pluginImplementationCount.incrementAndGet();
                                }
                            });
                        } catch (ClassNotFoundException exception) {
                            log.error("Plugin archive contains an unloadable class");
                        }
                    }
                    if ((entry.getName().contains("define")) && (entry.getName().endsWith(".yml") || entry.getName().endsWith(".yaml"))) {
                        PluginConfig config = readPluginConfig(jar, entry);
                        metadata.setParamCount(CollectionUtils.size(config.getParams()));
                    }
                }
                if (pluginItems.isEmpty()) {
                    throw new CommonException("Illegal plug-ins, please refer to https://hertzbeat.apache.org/docs/help/plugin/");
                }
            } catch (IOException exception) {
                log.error("Failed to read plugin archive");
                throw new CommonException("Failed to read plugin archive");
            }
        } catch (MalformedURLException exception) {
            log.error("Failed to resolve plugin archive URL");
            throw new CommonException("Failed to resolve plugin archive URL");
        } catch (YAMLException exception) {
            throw new CommonException("YAML the file format is incorrect");
        }
        metadata.setItems(pluginItems);
        return metadata;
    }

    /**
     * Validate that the file resides within the expected directory.
     *
     * @param file the file to validate
     */
    private void validateFilePath(File file) {
        pluginArtifactLifecycle.requireManagedJar(file);
    }

    /**
     * Validate that the URL uses the 'file:' protocol and does not point to an external resource.
     *
     * @param url the URL to validate
     */
    private void validateJarUrl(URL url) {
        if (!"file".equals(url.getProtocol())) {
            throw new CommonException("Invalid URL protocol: " + url.getProtocol());
        }
    }

    private void validateMetadata(PluginMetadata metadata) {
        if (metadataDao.countPluginMetadataByName(metadata.getName()) != 0) {
            throw new DataIntegrityViolationException("A plugin with this name already exists");
        }
    }

    @Override
    @Transactional
    public void savePlugin(PluginUpload pluginUpload) {
        if (pluginUpload == null || pluginUpload.getJarFile() == null || pluginUpload.getEnableStatus() == null
                || pluginUpload.getName() == null || pluginUpload.getName().isBlank()) {
            throw new IllegalArgumentException("Plugin upload fields are required");
        }
        validateUploadFile(pluginUpload);
        File destFile = pluginArtifactLifecycle.createUploadTarget(
                pluginUpload.getJarFile().getOriginalFilename());
        pluginArtifactLifecycle.registerUploadRollbackCleanup(destFile);
        try {
            pluginUpload.getJarFile().transferTo(destFile);
            PluginMetadata parsed = validateJarFile(destFile);
            List<PluginItem> pluginItems = parsed.getItems();
            PluginMetadata pluginMetadata = PluginMetadata.builder()
                .name(pluginUpload.getName())
                .enableStatus(pluginUpload.getEnableStatus())
                .paramCount(parsed.getParamCount())
                .items(pluginItems).jarFilePath(destFile.getAbsolutePath())
                .gmtCreate(LocalDateTime.now())
                .build();
            validateMetadata(pluginMetadata);
            metadataDao.save(pluginMetadata);
            itemDao.saveAll(pluginItems);
            afterCommitPublisher.publish(this::completeSavedPlugin);
        } catch (DataIntegrityViolationException exception) {
            pluginArtifactLifecycle.cleanupFailedUpload(destFile);
            throw exception;
        } catch (DataAccessException exception) {
            pluginArtifactLifecycle.cleanupFailedUpload(destFile);
            throw exception;
        } catch (CommonException | IllegalArgumentException exception) {
            pluginArtifactLifecycle.cleanupFailedUpload(destFile);
            throw new IllegalArgumentException("Invalid plugin archive");
        } catch (Exception exception) {
            pluginArtifactLifecycle.cleanupFailedUpload(destFile);
            throw new DataAccessResourceFailureException("Plugin artifact storage unavailable", exception);
        }
    }

    private void validateUploadFile(PluginUpload pluginUpload) {
        String originalFilename = pluginUpload.getJarFile().getOriginalFilename();
        if (pluginUpload.getJarFile().isEmpty()
                || pluginUpload.getJarFile().getSize() > MAX_PLUGIN_UPLOAD_BYTES
                || originalFilename == null || !originalFilename.endsWith(".jar")
                || originalFilename.matches(".*(\\.\\.|[\n\t\r/\\\\]).*")) {
            throw new IllegalArgumentException("Invalid plugin upload");
        }
    }

    private void completeSavedPlugin() {
        try {
            loadJarToClassLoader();
        } catch (RuntimeException exception) {
            log.error("Failed to reload plugin runtime after committed upload");
        }
        try {
            syncPluginStatus();
        } catch (RuntimeException exception) {
            log.error("Failed to converge plugin status after committed upload");
        }
    }

    @Override
    public boolean pluginIsEnable(Class<?> clazz) {
        return Boolean.TRUE.equals(PLUGIN_ENABLE_STATUS.get(clazz.getName()));
    }

    @Override
    public Page<PluginMetadata> getPlugins(String search, int pageIndex, int pageSize) {
        if (pageIndex < 0 || pageSize < 1 || pageSize > 100) {
            throw new IllegalArgumentException("Invalid plugin page");
        }
        // Get tag information
        Specification<PluginMetadata> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();
            if (search != null && !search.isEmpty()) {
                Predicate predicateApp = criteriaBuilder.like(root.get("name"), "%" + search + "%");
                andList.add(predicateApp);
            }
            Predicate[] andPredicates = new Predicate[andList.size()];
            Predicate andPredicate = criteriaBuilder.and(andList.toArray(andPredicates));

            if (andPredicates.length == 0) {
                return query.where().getRestriction();
            } else {
                return andPredicate;
            }
        };
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize);
        return metadataDao.findAll(specification, pageRequest);
    }

    /**
     * Load all plugin enabled states into memory
     */
    @PostConstruct
    private void syncPluginStatus() {
        List<PluginMetadata> plugins = metadataDao.findAll();
        Map<String, Boolean> statusMap = new HashMap<>();
        Map<String, Long> itemToPluginMetadataIdMap = new HashMap<>();
        for (PluginMetadata plugin : plugins) {
            for (PluginItem item : plugin.getItems()) {
                statusMap.put(item.getClassIdentifier(), plugin.getEnableStatus());
                itemToPluginMetadataIdMap.put(item.getClassIdentifier(), plugin.getId());
            }
        }
        PLUGIN_ENABLE_STATUS.clear();
        PLUGIN_ENABLE_STATUS.putAll(statusMap);
        ITEM_TO_PLUGINMETADATAID_MAP.clear();
        ITEM_TO_PLUGINMETADATAID_MAP.putAll(itemToPluginMetadataIdMap);
    }

    private void syncSinglePluginStatus(PluginMetadata plugin) {
        if (plugin == null || CollectionUtils.isEmpty(plugin.getItems())) {
            return;
        }
        for (PluginItem item : plugin.getItems()) {
            PLUGIN_ENABLE_STATUS.put(item.getClassIdentifier(), plugin.getEnableStatus());
            ITEM_TO_PLUGINMETADATAID_MAP.put(item.getClassIdentifier(), plugin.getId());
        }
    }

    /**
     * load jar to classloader
     */
    @PostConstruct
    private void loadJarToClassLoader() {
        pluginClassLoaderLock.writeLock().lock();
        try {
            try {
                for (URLClassLoader pluginClassLoader : pluginClassLoaders) {
                    if (pluginClassLoader != null) {
                        pluginClassLoader.close();
                    }
                }
            } catch (IOException exception) {
                throw new CommonException("Failed to reload plugin runtime");
            }

            if (!pluginClassLoaders.isEmpty()) {
                pluginClassLoaders.clear();
                System.gc();
            }
            pluginParameterRegistry.clearDefinitions();
            List<PluginMetadata> plugins = metadataDao.findPluginMetadataByEnableStatusTrue();
            for (PluginMetadata metadata : plugins) {
                try {
                    File managedJar = pluginArtifactLifecycle.requireManagedJar(new File(metadata.getJarFilePath()));
                    List<URL> urls = loadLibInPlugin(managedJar.getPath(), metadata.getId());
                    urls.add(managedJar.toURI().toURL());
                    pluginClassLoaders.add(
                            new URLClassLoader(urls.toArray(new URL[0]), Plugin.class.getClassLoader()));
                } catch (MalformedURLException exception) {
                    throw new CommonException("Failed to reload plugin runtime");
                } catch (IOException exception) {
                    log.error("Plugin artifact is unavailable during runtime reload");
                }
            }
        } finally {
            pluginClassLoaderLock.writeLock().unlock();
        }
    }

    /**
     * loading other JAR files that are dependencies for the plugin
     *
     * @param pluginJarPath    jar file path
     * @param pluginMetadataId plugin id
     * @return urls
     */

    private List<URL> loadLibInPlugin(String pluginJarPath, Long pluginMetadataId) throws IOException {
        File libDir = new File(getOtherLibDir(pluginJarPath));
        FileUtils.forceMkdir(libDir);
        List<URL> libUrls = new ArrayList<>();
        try (JarFile jarFile = new JarFile(pluginJarPath)) {
            Enumeration<JarEntry> entries = jarFile.entries();
            while (entries.hasMoreElements()) {
                JarEntry entry = entries.nextElement();
                File file = new File(libDir, entry.getName());
                String canonicalLibDir = libDir.getCanonicalPath() + File.separator;
                if (!file.getCanonicalPath().startsWith(canonicalLibDir)) {
                    throw new IOException("Invalid plugin archive entry");
                }
                if (entry.isDirectory()) {
                    continue;
                }
                if (entry.getName().endsWith(".jar")) {
                    if (!file.getParentFile().exists()) {
                        FileUtils.createParentDirectories(file);
                    }
                    try (InputStream in = jarFile.getInputStream(entry);
                        OutputStream out = new FileOutputStream(file)) {
                        byte[] buffer = new byte[4096];
                        int len;
                        while ((len = in.read(buffer)) != -1) {
                            out.write(buffer, 0, len);
                        }
                        libUrls.add(file.toURI().toURL());
                        out.flush();
                    }
                }
                if ((entry.getName().contains("define")) && (entry.getName().endsWith(".yml") || entry.getName().endsWith(".yaml"))) {
                    PluginConfig config = readPluginConfig(jarFile, entry);
                    pluginParameterRegistry.registerDefinition(pluginMetadataId, config);
                }
            }
        }
        return libUrls;
    }

    /**
     * Read the plugin configuration file from the jar package
     *
     * @return plugin config
     */
    private PluginConfig readPluginConfig(JarFile jarFile, JarEntry entry) throws IOException {
        Yaml yaml = new Yaml();
        try (InputStream ymlInputStream = jarFile.getInputStream(entry)) {
            PluginConfig config = yaml.loadAs(ymlInputStream, PluginConfig.class);
            if (config == null) {
                return new PluginConfig();
            }
            return config;
        }
    }

    @Override
    public <T> void pluginExecute(Class<T> clazz, Consumer<T> execute) {
        pluginClassLoaderLock.readLock().lock();
        try {
            for (URLClassLoader pluginClassLoader : pluginClassLoaders) {
                ServiceLoader<T> loaded = ServiceLoader.load(clazz, pluginClassLoader);
                for (T plugin : loaded) {
                    if (pluginIsEnable(plugin.getClass())) {
                        execute.accept(plugin);
                    }
                }
            }
        } finally {
            pluginClassLoaderLock.readLock().unlock();
        }
    }

    @Override
    public <T> void pluginExecute(Class<T> clazz, BiConsumer<T, PluginContext> execute) {
        pluginClassLoaderLock.readLock().lock();
        try {
            for (URLClassLoader pluginClassLoader : pluginClassLoaders) {
                ServiceLoader<T> loaded = ServiceLoader.load(clazz, pluginClassLoader);
                for (T plugin : loaded) {
                    if (!pluginIsEnable(plugin.getClass())) {
                        continue;
                    }
                    Long pluginId = ITEM_TO_PLUGINMETADATAID_MAP.get(plugin.getClass().getName());
                    PluginContext context = pluginParameterRegistry.runtimeContext(pluginId);
                    execute.accept(plugin, context);
                }
            }
        } finally {
            pluginClassLoaderLock.readLock().unlock();
        }
    }
}
