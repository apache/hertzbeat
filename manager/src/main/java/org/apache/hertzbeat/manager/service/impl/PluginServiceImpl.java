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

import jakarta.persistence.criteria.Predicate;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.ServiceLoader;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;
import javax.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FileUtils;
import org.apache.hertzbeat.common.constants.PluginType;
import org.apache.hertzbeat.common.entity.dto.PluginUpload;
import org.apache.hertzbeat.common.entity.manager.PluginItem;
import org.apache.hertzbeat.common.entity.manager.PluginMetadata;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.manager.dao.PluginItemDao;
import org.apache.hertzbeat.manager.dao.PluginMetadataDao;
import org.apache.hertzbeat.manager.service.PluginService;
import org.apache.hertzbeat.plugin.Plugin;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

/**
 * plugin service
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PluginServiceImpl implements PluginService {

    private final PluginMetadataDao metadataDao;

    private final PluginItemDao itemDao;

    public static Map<Class<?>, PluginType> PLUGIN_TYPE_MAPPING = new HashMap<>();

    /**
     * plugin status
     */
    private static final Map<String, Boolean> PLUGIN_ENABLE_STATUS = new ConcurrentHashMap<>();


    private final List<URLClassLoader> pluginClassLoaders = new ArrayList<>();

    @Override
    public void deletePlugins(Set<Long> ids) {
        List<PluginMetadata> plugins = metadataDao.findAllById(ids);
        // disable the plugins that need to be removed
        for (PluginMetadata plugin : plugins) {
            plugin.setEnableStatus(false);
            updateStatus(plugin);
        }
        loadJarToClassLoader();
        for (PluginMetadata plugin : plugins) {
            try {
                // delete jar file
                File jarFile = new File(plugin.getJarFilePath());
                if (jarFile.exists()) {
                    FileUtils.delete(jarFile);
                }
                // removing jar files that are dependencies for the plugin
                File otherLibDir = new File(getOtherLibDir(plugin.getJarFilePath()));
                if (otherLibDir.exists()) {
                    FileUtils.deleteDirectory(otherLibDir);
                }
                // delete metadata
                metadataDao.deleteById(plugin.getId());
            } catch (IOException e) {
                throw new RuntimeException(e);
            }

        }
        syncPluginStatus();
        // reload classloader
        loadJarToClassLoader();
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
    public void updateStatus(PluginMetadata plugin) {
        Optional<PluginMetadata> pluginMetadata = metadataDao.findById(plugin.getId());
        if (pluginMetadata.isPresent()) {
            PluginMetadata metadata = pluginMetadata.get();
            metadata.setEnableStatus(plugin.getEnableStatus());
            metadataDao.save(metadata);
            syncPluginStatus();
        } else {
            throw new IllegalArgumentException("The plugin is not existed");
        }
    }

    static {
        PLUGIN_TYPE_MAPPING.put(Plugin.class, PluginType.POST_ALERT);
    }

    /**
     * verify the type of the jar package
     *
     * @param jarFile jar file
     * @return return the full path of the Plugin interface implementation class
     */
    public List<PluginItem> validateJarFile(File jarFile) {
        List<PluginItem> pluginItems = new ArrayList<>();
        try {
            URL jarUrl = new URL("file:" + jarFile.getAbsolutePath());
            try (URLClassLoader classLoader = new URLClassLoader(new URL[]{jarUrl}, this.getClass().getClassLoader());
                JarFile jar = new JarFile(jarFile)) {
                Enumeration<JarEntry> entries = jar.entries();
                while (entries.hasMoreElements()) {
                    JarEntry entry = entries.nextElement();
                    if (entry.getName().endsWith(".class")) {
                        String className = entry.getName().replace("/", ".").replace(".class", "");
                        try {
                            Class<?> cls = classLoader.loadClass(className);
                            if (!cls.isInterface()) {
                                PLUGIN_TYPE_MAPPING.forEach((clazz, type) -> {
                                    if (clazz.isAssignableFrom(cls)) {
                                        pluginItems.add(new PluginItem(className, type));
                                    }
                                });
                            }
                        } catch (ClassNotFoundException e) {
                            System.err.println("Failed to load class: " + className);
                        }
                    }
                }
                if (pluginItems.isEmpty()) {
                    throw new CommonException("Illegal plug-ins, please refer to https://hertzbeat.apache.org/docs/help/plugin/");
                }
            } catch (IOException e) {
                log.error("Error reading JAR file:{}", jarFile.getAbsoluteFile(), e);
                throw new CommonException("Error reading JAR file: " + jarFile.getAbsolutePath());
            }
        } catch (MalformedURLException e) {
            log.error("Invalid JAR file URL: {}", jarFile.getAbsoluteFile(), e);
            throw new CommonException("Invalid JAR file URL: " + jarFile.getAbsolutePath());
        }
        return pluginItems;
    }

    private void validateMetadata(PluginMetadata metadata) {
        if (metadataDao.countPluginMetadataByName(metadata.getName()) != 0) {
            throw new CommonException("A plugin named " + metadata.getName() + " already exists");
        }
    }

    @Override
    @SneakyThrows
    public void savePlugin(PluginUpload pluginUpload) {
        String jarPath = new File(this.getClass().getProtectionDomain().getCodeSource().getLocation().getPath()).getAbsolutePath();
        Path extLibPath = Paths.get(new File(jarPath).getParent(), "plugin-lib");
        File extLibDir = extLibPath.toFile();

        String fileName = pluginUpload.getJarFile().getOriginalFilename();
        if (fileName == null) {
            throw new CommonException("Failed to upload plugin");
        }
        fileName = UUID.randomUUID().toString().replace("-", "") + "_" + fileName;
        File destFile = new File(extLibDir, fileName);
        FileUtils.createParentDirectories(destFile);
        pluginUpload.getJarFile().transferTo(destFile);
        List<PluginItem> pluginItems;
        PluginMetadata pluginMetadata;
        try {
            pluginItems = validateJarFile(destFile);
            pluginMetadata = PluginMetadata.builder()
                .name(pluginUpload.getName())
                .enableStatus(true)
                .items(pluginItems).jarFilePath(destFile.getAbsolutePath())
                .gmtCreate(LocalDateTime.now())
                .build();
            validateMetadata(pluginMetadata);
        } catch (Exception e) {
            // verification failed, delete file
            FileUtils.delete(destFile);
            throw e;
        }
        // save plugin metadata
        metadataDao.save(pluginMetadata);
        itemDao.saveAll(pluginItems);
        // load jar to classloader
        loadJarToClassLoader();
        // sync enabled status
        syncPluginStatus();
    }

    @Override
    public boolean pluginIsEnable(Class<?> clazz) {
        return Boolean.TRUE.equals(PLUGIN_ENABLE_STATUS.get(clazz.getName()));
    }

    @Override
    public Page<PluginMetadata> getPlugins(String search, int pageIndex, int pageSize) {
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
        for (PluginMetadata plugin : plugins) {
            for (PluginItem item : plugin.getItems()) {
                statusMap.put(item.getClassIdentifier(), plugin.getEnableStatus());
            }
        }
        PLUGIN_ENABLE_STATUS.clear();
        PLUGIN_ENABLE_STATUS.putAll(statusMap);
    }

    /**
     * load jar to classloader
     */
    @PostConstruct
    private void loadJarToClassLoader() {
        try {
            for (URLClassLoader pluginClassLoader : pluginClassLoaders) {
                if (pluginClassLoader != null) {
                    pluginClassLoader.close();
                }
            }
            pluginClassLoaders.clear();
            System.gc();
            List<PluginMetadata> plugins = metadataDao.findPluginMetadataByEnableStatusTrue();
            for (PluginMetadata metadata : plugins) {
                List<URL> urls = loadLibInPlugin(metadata.getJarFilePath());
                urls.add(new File(metadata.getJarFilePath()).toURI().toURL());
                pluginClassLoaders.add(new URLClassLoader(urls.toArray(new URL[0]), Plugin.class.getClassLoader()));
            }
        } catch (MalformedURLException e) {
            log.error("Failed to load plugin:{}", e.getMessage());
            throw new CommonException("Failed to load plugin:" + e.getMessage());
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    /**
     * loading other JAR files that are dependencies for the plugin
     *
     * @param pluginJarPath jar file path
     * @return urls
     */
    @SneakyThrows
    private List<URL> loadLibInPlugin(String pluginJarPath) {
        File libDir = new File(getOtherLibDir(pluginJarPath));
        FileUtils.forceMkdir(libDir);
        List<URL> libUrls = new ArrayList<>();
        try (JarFile jarFile = new JarFile(pluginJarPath)) {
            Enumeration<JarEntry> entries = jarFile.entries();
            while (entries.hasMoreElements()) {
                JarEntry entry = entries.nextElement();
                File file = new File(libDir, entry.getName());
                if (!entry.isDirectory() && entry.getName().endsWith(".jar")) {
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
            }
        }
        return libUrls;
    }

    @Override
    public <T> void pluginExecute(Class<T> clazz, Consumer<T> execute) {
        for (URLClassLoader pluginClassLoader : pluginClassLoaders) {
            ServiceLoader<T> load = ServiceLoader.load(clazz, pluginClassLoader);
            for (T t : load) {
                if (pluginIsEnable(t.getClass())) {
                    execute.accept(t);
                }
            }
        }
    }
}
