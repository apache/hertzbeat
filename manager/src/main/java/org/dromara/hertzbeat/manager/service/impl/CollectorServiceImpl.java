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

package org.dromara.hertzbeat.manager.service.impl;

import org.dromara.hertzbeat.common.entity.dto.CollectorSummary;
import org.dromara.hertzbeat.common.entity.manager.Collector;
import org.dromara.hertzbeat.common.entity.manager.CollectorMonitorBind;
import org.dromara.hertzbeat.common.support.exception.CommonException;
import org.dromara.hertzbeat.manager.dao.CollectorDao;
import org.dromara.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.dromara.hertzbeat.manager.scheduler.netty.ManageServer;
import org.dromara.hertzbeat.manager.scheduler.AssignJobs;
import org.dromara.hertzbeat.manager.scheduler.ConsistentHash;
import org.dromara.hertzbeat.manager.service.CollectorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedList;
import java.util.List;

/**
 * collector service impl
 * @author tom
 */
@Service
@Transactional(rollbackFor = Exception.class)
public class CollectorServiceImpl implements CollectorService {
    
    @Autowired
    private CollectorDao collectorDao;

    @Autowired
    private CollectorMonitorBindDao collectorMonitorBindDao;
    
    @Autowired
    private ConsistentHash consistentHash;
    
    @Autowired(required = false)
    private ManageServer manageServer;
    
    @Override
    @Transactional(readOnly = true)
    public Page<CollectorSummary> getCollectors(Specification<Collector> specification, PageRequest pageRequest) {
        Page<Collector> collectors = collectorDao.findAll(specification, pageRequest);
        List<CollectorSummary> collectorSummaryList = new LinkedList<>();
        for (Collector collector : collectors.getContent()) {
            CollectorSummary.CollectorSummaryBuilder summaryBuilder = CollectorSummary.builder().collector(collector);
            ConsistentHash.Node node = consistentHash.getNode(collector.getName());
            if (node != null && node.getAssignJobs() != null) {
                AssignJobs assignJobs = node.getAssignJobs();
                summaryBuilder.pinMonitorNum(assignJobs.getPinnedJobs().size());
                summaryBuilder.dispatchMonitorNum(assignJobs.getJobs().size());
            }
            collectorSummaryList.add(summaryBuilder.build());
        }
        return new PageImpl<>(collectorSummaryList, pageRequest, collectors.getTotalElements());
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteRegisteredCollector(List<String> collectors) {
        if (collectors == null || collectors.isEmpty()) {
            return;
        }
        // Determine whether there are fixed tasks on the collector
        collectors.forEach(collector -> {
            List<CollectorMonitorBind> binds = this.collectorMonitorBindDao.findCollectorMonitorBindsByCollector(collector);
            if (!binds.isEmpty()) {
                throw new CommonException("The collector " + collector + " has pinned tasks that cannot be deleted.");
            }
        });
        collectors.forEach(collector -> {
            this.manageServer.closeChannel(collector);
            this.collectorDao.deleteCollectorByName(collector);
        });
    }

    @Override
    public boolean hasCollector(String collector) {
        return this.collectorDao.findCollectorByName(collector).isPresent();
    }
}
