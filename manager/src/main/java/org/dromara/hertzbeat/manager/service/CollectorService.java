package org.dromara.hertzbeat.manager.service;

import org.dromara.hertzbeat.common.entity.dto.CollectorSummary;
import org.dromara.hertzbeat.common.entity.manager.Collector;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

/**
 * collector service
 * @author tom
 */
public interface CollectorService {
    
    /**
     * Dynamic conditional query
     *
     * @param specification Query conditions
     * @param pageRequest pageIndex pageSize
     * @return Search result
     */
    Page<CollectorSummary> getCollectors(Specification<Collector> specification, PageRequest pageRequest);
    
    /**
     * delete registered collectors
     * @param collectors collector
     */
    void deleteRegisteredCollector(List<String> collectors);

    /**
     * is has the collector name
     * @param collector collector name
     * @return return true if it has
     */
    boolean hasCollector(String collector);
}
