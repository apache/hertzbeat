/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.monitor.definition;

import com.obs.services.ObsClient;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import org.apache.commons.io.IOUtils;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.FileDTO;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreDTO;
import org.apache.hertzbeat.manager.service.ObjectStoreService;
import org.apache.hertzbeat.manager.service.impl.ObsObjectStoreServiceImpl;

/** Huawei OBS-backed custom monitor definitions. */
final class ObsMonitorDefinitionStore implements MonitorDefinitionStore {

    private final ObsClient client;
    private final ObjectStoreService store;

    private ObsMonitorDefinitionStore(ObsClient client, ObjectStoreService store) {
        this.client = client;
        this.store = store;
    }

    static MonitorDefinitionStore open(ObjectStoreDTO<?> config) {
        ObjectStoreDTO.ObsConfig options = JsonUtil.convertValue(config.getConfig(), ObjectStoreDTO.ObsConfig.class);
        if (options == null) {
            throw new IllegalArgumentException("OBS config is required");
        }
        ObsClient client = new ObsClient(options.getAccessKey(), options.getSecretKey(), options.getEndpoint());
        ObjectStoreService store = new ObsObjectStoreServiceImpl(
                client, options.getBucketName(), options.getSavePath());
        return new ObsMonitorDefinitionStore(client, store);
    }

    @Override
    public Map<String, String> loadAll() {
        Map<String, String> definitions = new LinkedHashMap<>();
        store.list("define").forEach(file -> definitions.put(identity(file), read(file.getInputStream())));
        return Map.copyOf(definitions);
    }

    @Override
    public String load(String app) {
        String path = path(app);
        if (!store.isExist(path)) {
            return null;
        }
        FileDTO file = store.download(path);
        if (file == null || file.getInputStream() == null) {
            throw new IllegalStateException("monitor definition object could not be read");
        }
        return read(file.getInputStream());
    }

    @Override
    public void save(String app, String definition) {
        boolean uploaded = store.upload(path(app), IOUtils.toInputStream(definition, StandardCharsets.UTF_8));
        if (!uploaded) {
            throw new IllegalStateException("monitor definition object could not be written");
        }
    }

    @Override
    public void delete(String app) {
        store.remove(path(app));
    }

    @Override
    public void close() {
        try {
            client.close();
        } catch (Exception error) {
            throw new IllegalStateException("monitor definition object store could not be closed", error);
        }
    }

    private String path(String app) {
        return "define/app-" + MonitorDefinitionIdentity.normalize(app) + ".yml";
    }

    private String identity(FileDTO file) {
        String name = file.getName();
        int fileNameStart = name.lastIndexOf('/') + 1;
        int prefixLength = name.startsWith("app-", fileNameStart) ? "app-".length() : 0;
        int extensionStart = name.lastIndexOf('.');
        if (extensionStart <= fileNameStart + prefixLength) {
            throw new IllegalStateException("monitor definition object name is invalid");
        }
        return MonitorDefinitionIdentity.normalize(name.substring(fileNameStart + prefixLength, extensionStart));
    }

    private String read(InputStream input) {
        if (input == null) {
            throw new IllegalStateException("monitor definition object could not be read");
        }
        try (input) {
            return IOUtils.toString(input, StandardCharsets.UTF_8);
        } catch (Exception error) {
            throw new IllegalStateException("monitor definition object could not be read", error);
        }
    }
}
