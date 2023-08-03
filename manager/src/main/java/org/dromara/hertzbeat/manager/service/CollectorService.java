package org.dromara.hertzbeat.manager.service;

import org.dromara.hertzbeat.common.entity.dto.CollectorSummary;
import org.dromara.hertzbeat.common.entity.manager.Collector;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

/**
 * collector service
 *
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
    
}
