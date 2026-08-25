/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.monitor.definition;

import org.apache.hertzbeat.manager.dao.DefineDao;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreDTO;
import org.springframework.stereotype.Component;

/** Opens definition stores for both runtime use and detached migration targets. */
@Component
public class MonitorDefinitionStoreFactory {

    private final DefineDao defineDao;

    public MonitorDefinitionStoreFactory(DefineDao defineDao) {
        this.defineDao = defineDao;
    }

    public MonitorDefinitionStore open(ObjectStoreDTO<?> config) {
        ObjectStoreDTO.Type type = config == null ? ObjectStoreDTO.Type.DATABASE : config.getType();
        if (type == ObjectStoreDTO.Type.FILE) {
            return new FileMonitorDefinitionStore();
        }
        if (type == ObjectStoreDTO.Type.OBS) {
            return ObsMonitorDefinitionStore.open(config);
        }
        return new DatabaseMonitorDefinitionStore(defineDao);
    }
}
