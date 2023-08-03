package org.dromara.hertzbeat.manager.service.impl;

import org.dromara.hertzbeat.common.entity.dto.CollectorSummary;
import org.dromara.hertzbeat.common.entity.manager.Collector;
import org.dromara.hertzbeat.manager.dao.CollectorDao;
import org.dromara.hertzbeat.manager.scheduler.AssignJobs;
import org.dromara.hertzbeat.manager.scheduler.ConsistentHash;
import org.dromara.hertzbeat.manager.service.CollectorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.LinkedList;
import java.util.List;

/**
 * collector service impl
 *
 */
@Service
public class CollectorServiceImpl implements CollectorService {
    
    @Autowired
    private CollectorDao collectorDao;
    
    @Autowired
    private ConsistentHash consistentHash;
    
    @Override
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
}
