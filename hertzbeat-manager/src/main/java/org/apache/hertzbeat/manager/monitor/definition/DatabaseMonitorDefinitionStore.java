/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.monitor.definition;

import java.util.LinkedHashMap;
import java.util.Map;
import org.apache.hertzbeat.common.entity.manager.Define;
import org.apache.hertzbeat.manager.dao.DefineDao;

/** Database-backed custom monitor definitions. */
final class DatabaseMonitorDefinitionStore implements MonitorDefinitionStore {

    private final DefineDao defineDao;

    DatabaseMonitorDefinitionStore(DefineDao defineDao) {
        this.defineDao = defineDao;
    }

    @Override
    public Map<String, String> loadAll() {
        Map<String, String> definitions = new LinkedHashMap<>();
        defineDao.findAll().forEach(define -> definitions.put(
                MonitorDefinitionIdentity.normalize(define.getApp()), define.getContent()));
        return Map.copyOf(definitions);
    }

    @Override
    public String load(String app) {
        return defineDao.findById(app).map(Define::getContent).orElse(null);
    }

    @Override
    public void save(String app, String definition) {
        Define entity = new Define();
        entity.setApp(app);
        entity.setContent(definition);
        defineDao.save(entity);
    }

    @Override
    public void delete(String app) {
        defineDao.deleteById(app);
    }
}
