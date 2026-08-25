/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.monitor.definition;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import org.apache.commons.io.FileUtils;

/** File-system-backed custom monitor definitions. */
final class FileMonitorDefinitionStore implements MonitorDefinitionStore {

    private final File directory;

    FileMonitorDefinitionStore() {
        var rootUrl = getClass().getClassLoader().getResource("");
        if (rootUrl == null || !"file".equals(rootUrl.getProtocol())) {
            throw new IllegalStateException("monitor definition file store is unavailable");
        }
        directory = new File(rootUrl.getPath(), "define");
    }

    @Override
    public Map<String, String> loadAll() {
        if (!directory.exists()) {
            return Map.of();
        }
        File[] files = directory.listFiles(file -> file.isFile()
                && (file.getName().endsWith(".yml") || file.getName().endsWith(".yaml")));
        if (files == null) {
            throw new IllegalStateException("monitor definition directory could not be read");
        }
        Map<String, String> definitions = new LinkedHashMap<>();
        Arrays.stream(files).forEach(file -> definitions.put(identity(file.getName()), read(file)));
        return Map.copyOf(definitions);
    }

    @Override
    public String load(String app) {
        File file = file(app);
        return file.exists() ? read(file) : null;
    }

    @Override
    public void save(String app, String definition) {
        try {
            FileUtils.writeStringToFile(file(app), definition, StandardCharsets.UTF_8, false);
        } catch (Exception error) {
            throw new IllegalStateException("monitor definition file could not be written", error);
        }
    }

    @Override
    public void delete(String app) {
        try {
            FileUtils.delete(file(app));
        } catch (Exception error) {
            throw new IllegalStateException("monitor definition file could not be removed", error);
        }
    }

    private File file(String app) {
        return new File(directory, "app-" + MonitorDefinitionIdentity.normalize(app) + ".yml");
    }

    private String identity(String fileName) {
        int prefixLength = fileName.startsWith("app-") ? "app-".length() : 0;
        int extensionStart = fileName.lastIndexOf('.');
        return MonitorDefinitionIdentity.normalize(fileName.substring(prefixLength, extensionStart));
    }

    private String read(File file) {
        try {
            return FileUtils.readFileToString(file, StandardCharsets.UTF_8);
        } catch (Exception error) {
            throw new IllegalStateException("monitor definition file could not be read", error);
        }
    }
}
