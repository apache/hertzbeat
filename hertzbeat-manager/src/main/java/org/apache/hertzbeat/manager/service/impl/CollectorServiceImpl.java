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
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.dto.CollectorSummary;
import org.apache.hertzbeat.common.entity.manager.Collector;
import org.apache.hertzbeat.common.entity.manager.CollectorMonitorBind;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.common.util.IpDomainUtil;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.apache.hertzbeat.manager.scheduler.AssignJobs;
import org.apache.hertzbeat.manager.scheduler.ConsistentHash;
import org.apache.hertzbeat.manager.scheduler.netty.ManageServer;
import org.apache.hertzbeat.manager.service.CollectorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * collector service impl
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
    public Page<CollectorSummary> getCollectors(String name, int pageIndex, Integer pageSize) {
        if (pageSize == null) {
            pageSize = Integer.MAX_VALUE;
        }
        Specification<Collector> specification = (root, query, criteriaBuilder) -> {
            Predicate predicate = criteriaBuilder.conjunction();
            if (StringUtils.isNotBlank(name)) {
                Predicate predicateName = criteriaBuilder.like(root.get("name"), "%" + name + "%");
                predicate = criteriaBuilder.and(predicateName);
            }
            return predicate;
        };
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize);
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
        if (CollectionUtils.isEmpty(collectors)) {
            return;
        }
        // Determine whether there are fixed tasks on the collector
        collectors.forEach(collector -> {
            List<CollectorMonitorBind> binds = this.collectorMonitorBindDao.findCollectorMonitorBindsByCollector(collector);
            if (CollectionUtils.isNotEmpty(binds)) {
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

    @Override
    public Map<String, String> generateCollectorDeployInfo(String collector) {
        if (hasCollector(collector)) {
            throw new CommonException("There already exists a collector with same name.");
        }
        String host = IpDomainUtil.getLocalhostIp();
        Map<String, String> maps = new HashMap<>(6);
        maps.put("identity", collector);
        maps.put("host", host);
        return maps;
    }

    @Override
    public void makeCollectorsOffline(List<String> collectors) {
        if (CollectionUtils.isNotEmpty(collectors)) {
            collectors.forEach(collector -> this.manageServer.getCollectorAndJobScheduler().offlineCollector(collector));
        }
    }

    @Override
    public void makeCollectorsOnline(List<String> collectors) {
        if (CollectionUtils.isNotEmpty(collectors)) {
            collectors.forEach(collector ->
                    this.manageServer.getCollectorAndJobScheduler().onlineCollector(collector));
        }
    }
}
