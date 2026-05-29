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

package org.apache.hertzbeat.manager.service.entity;

import java.util.List;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.manager.dao.EntityMonitorBindDao;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

/**
 * Persists entity monitor-bind rows for the monitor-bind domain boundary.
 */
@Service
public class EntityMonitorBindWriteModelService {

    private final EntityMonitorBindDao entityMonitorBindDao;

    public EntityMonitorBindWriteModelService(EntityMonitorBindDao entityMonitorBindDao) {
        this.entityMonitorBindDao = entityMonitorBindDao;
    }

    public void deleteMonitorBinds(Long entityId) {
        entityMonitorBindDao.deleteAllByEntityId(entityId);
        entityMonitorBindDao.flush();
    }

    public void deleteMonitorBindsByMonitorIds(Set<Long> monitorIds) {
        if (CollectionUtils.isEmpty(monitorIds)) {
            return;
        }
        entityMonitorBindDao.deleteAllByMonitorIdIn(monitorIds);
    }

    public void replaceMonitorBinds(Long entityId, List<EntityMonitorBind> rows) {
        entityMonitorBindDao.deleteAllByEntityId(entityId);
        entityMonitorBindDao.flush();
        if (!CollectionUtils.isEmpty(rows)) {
            entityMonitorBindDao.saveAll(rows);
        }
    }
}
