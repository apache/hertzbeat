package org.dromara.hertzbeat.alert.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.alert.dao.AlertConvergeDao;
import org.dromara.hertzbeat.alert.service.AlertConvergeService;
import org.dromara.hertzbeat.common.entity.alerter.AlertConverge;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

/**
 * implement for alert converge service
 *
 * @author tom
 */
@Service
@Transactional(rollbackFor = Exception.class)
@Slf4j
public class AlertConvergeServiceImpl implements AlertConvergeService {
    
    @Autowired
    private AlertConvergeDao alertConvergeDao;    
 
    @Override
    public void validate(AlertConverge alertConverge, boolean isModify) throws IllegalArgumentException {
        // todo 
    }
    
    @Override
    public void addAlertConverge(AlertConverge alertConverge) throws RuntimeException {
        alertConvergeDao.save(alertConverge);
    }
    
    @Override
    public void modifyAlertConverge(AlertConverge alertConverge) throws RuntimeException {
        alertConvergeDao.save(alertConverge);
    }
    
    @Override
    public AlertConverge getAlertConverge(long convergeId) throws RuntimeException {
        return alertConvergeDao.findById(convergeId).orElse(null);
    }
    
    @Override
    public void deleteAlertConverges(Set<Long> convergeIds) throws RuntimeException {
        alertConvergeDao.deleteAlertConvergesByIdIn(convergeIds);
    }
    
    @Override
    public Page<AlertConverge> getAlertConverges(Specification<AlertConverge> specification, PageRequest pageRequest) {
        return alertConvergeDao.findAll(specification, pageRequest);
    }
}
