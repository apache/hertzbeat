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

import java.util.Collections;
import java.util.List;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.manager.dao.EntityMonitorBindDao;
import org.springframework.stereotype.Service;

/**
 * Owns persisted monitor-bind evidence lookup for entity read-model boundaries.
 */
@Service
public class EntityMonitorBindQueryService {

    private final EntityMonitorBindDao entityMonitorBindDao;

    public EntityMonitorBindQueryService(EntityMonitorBindDao entityMonitorBindDao) {
        this.entityMonitorBindDao = entityMonitorBindDao;
    }

    public List<EntityMonitorBind> findMonitorBinds(Long entityId) {
        return entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(entityId);
    }

    public List<EntityMonitorBind> findMonitorBindsByMonitorId(Long monitorId) {
        if (monitorId == null) {
            return Collections.emptyList();
        }
        return entityMonitorBindDao.findAllByMonitorId(monitorId);
    }

    public long countMonitorBinds(Long entityId) {
        return entityMonitorBindDao.countByEntityId(entityId);
    }
}
