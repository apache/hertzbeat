package org.dromara.hertzbeat.manager.service.impl;

import org.dromara.hertzbeat.common.entity.manager.Collector;
import org.dromara.hertzbeat.manager.dao.CollectorDao;
import org.dromara.hertzbeat.manager.service.CollectorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * collector service impl
 * @author tom
 */
@Service
public class CollectorServiceImpl implements CollectorService {
    
    @Autowired
    private CollectorDao collectorDao;
    
    @Override
    public List<Collector> getCollectors(Specification<Collector> specification) {
        return collectorDao.findAll(specification);
    }
}
