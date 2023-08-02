package org.dromara.hertzbeat.manager.service;

import org.dromara.hertzbeat.common.entity.manager.Collector;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

/**
 * collector service
 *
 */
public interface CollectorService {
    
    /**
     * Dynamic conditional query
     * @param specification Query conditions   
     * @return Search result   
     */
    List<Collector> getCollectors(Specification<Collector> specification);
    
}
