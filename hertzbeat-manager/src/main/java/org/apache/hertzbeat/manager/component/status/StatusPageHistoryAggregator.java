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

package org.apache.hertzbeat.manager.component.status;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.manager.StatusPageHistory;
import org.apache.hertzbeat.manager.dao.StatusPageHistoryDao;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Atomically compact a completed local day without deleting the retained entity.
 */
@Service
public class StatusPageHistoryAggregator {

    private final StatusPageHistoryDao historyDao;

    public StatusPageHistoryAggregator(StatusPageHistoryDao historyDao) {
        this.historyDao = historyDao;
    }

    @Transactional
    public void combinePreviousDay(LocalDate today, ZoneId zone, int interval) {
        long start = today.minusDays(1).atStartOfDay(zone).toInstant().toEpochMilli();
        long end = today.atStartOfDay(zone).toInstant().toEpochMilli();
        Map<Long, List<StatusPageHistory>> groups = new LinkedHashMap<>();
        for (StatusPageHistory history : historyDao.findForAggregation(start, end)) {
            groups.computeIfAbsent(history.getComponentId(), ignored -> new ArrayList<>()).add(history);
        }
        for (List<StatusPageHistory> histories : groups.values()) {
            StatusPageHistory retained = histories.get(0);
            StatusPageHistory summary = StatusPageHistorySummary.summarize(histories,
                    retained.getComponentId(), retained.getTimestamp(), interval, retained.getState());
            retained.setNormal(summary.getNormal());
            retained.setAbnormal(summary.getAbnormal());
            retained.setUnknowing(summary.getUnknowing());
            retained.setUptime(summary.getUptime());
            retained.setState(summary.getState());
            historyDao.save(retained);
            historyDao.deleteAll(histories.subList(1, histories.size()));
        }
    }
}
