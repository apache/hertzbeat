package org.dromara.hertzbeat.manager.service.impl;

import org.dromara.hertzbeat.common.entity.manager.StatusPageComponent;
import org.dromara.hertzbeat.common.entity.manager.StatusPageOrg;
import org.dromara.hertzbeat.manager.dao.StatusPageComponentDao;
import org.dromara.hertzbeat.manager.dao.StatusPageOrgDao;
import org.dromara.hertzbeat.manager.service.StatusPageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * status page service implement.
 * @author tom
 */
@Service
public class StatusPageServiceImpl implements StatusPageService {
    
    @Autowired
    private StatusPageOrgDao statusPageOrgDao;
    
    @Autowired
    private StatusPageComponentDao statusPageComponentDao;
    
    @Override
    public StatusPageOrg queryStatusPageOrg() {
        return statusPageOrgDao.findAll().stream().findFirst().orElse(null);
    }

    @Override
    public StatusPageOrg saveStatusPageOrg(StatusPageOrg statusPageOrg) {
        return statusPageOrgDao.save(statusPageOrg);
    }

    @Override
    public List<StatusPageComponent> queryStatusPageComponents() {
        return statusPageComponentDao.findAll();
    }

    @Override
    public void newStatusPageComponent(StatusPageComponent statusPageComponent) {
        statusPageComponentDao.save(statusPageComponent);
    }

    @Override
    public void updateStatusPageComponent(StatusPageComponent statusPageComponent) {
        statusPageComponentDao.save(statusPageComponent);
    }

    @Override
    public void deleteStatusPageComponent(long id) {
        statusPageComponentDao.deleteById(id);
    }

    @Override
    public StatusPageComponent queryStatusPageComponent(long id) {
        return statusPageComponentDao.findById(id).orElse(null);
    }
}
