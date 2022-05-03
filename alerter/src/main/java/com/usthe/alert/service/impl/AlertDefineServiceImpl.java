package com.usthe.alert.service.impl;

import com.usthe.alert.dao.AlertDefineBindDao;
import com.usthe.alert.dao.AlertDefineDao;
import com.usthe.common.entity.alerter.AlertDefine;
import com.usthe.common.entity.alerter.AlertDefineMonitorBind;
import com.usthe.alert.service.AlertDefineService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 告警定义管理接口实现
 * @author tom
 * @date 2021/12/9 10:17
 */
@Service
@Transactional(rollbackFor = Exception.class)
@Slf4j
public class AlertDefineServiceImpl implements AlertDefineService {

    @Autowired
    private AlertDefineDao alertDefineDao;

    @Autowired
    private AlertDefineBindDao alertDefineBindDao;

    @Override
    public void validate(AlertDefine alertDefine, boolean isModify) throws IllegalArgumentException {
        // todo
    }

    @Override
    public void addAlertDefine(AlertDefine alertDefine) throws RuntimeException {
        alertDefineDao.save(alertDefine);
    }

    @Override
    public void modifyAlertDefine(AlertDefine alertDefine) throws RuntimeException {
        alertDefineDao.save(alertDefine);
    }

    @Override
    public void deleteAlertDefine(long alertId) throws RuntimeException {
        alertDefineDao.deleteById(alertId);
    }

    @Override
    public AlertDefine getAlertDefine(long alertId) throws RuntimeException {
        Optional<AlertDefine> optional = alertDefineDao.findById(alertId);
        return optional.orElse(null);
    }

    @Override
    public void deleteAlertDefines(Set<Long> alertIds) throws RuntimeException {
        alertDefineDao.deleteAlertDefinesByIdIn(alertIds);
    }

    @Override
    public Page<AlertDefine> getMonitorBindAlertDefines(Specification<AlertDefine> specification, PageRequest pageRequest) {
        return alertDefineDao.findAll(specification, pageRequest);
    }

    @Override
    public void applyBindAlertDefineMonitors(Long alertId, List<AlertDefineMonitorBind> alertDefineBinds) {
        // todo 校验此告警定义和监控是否存在

        // 先删除此告警的所有关联
        alertDefineBindDao.deleteAlertDefineBindsByAlertDefineIdEquals(alertId);
        // 保存关联
        alertDefineBindDao.saveAll(alertDefineBinds);
    }

    @Override
    public Map<String, List<AlertDefine>> getMonitorBindAlertDefines(long monitorId, String app, String metrics) {
        List<AlertDefine> defines = alertDefineDao.queryAlertDefinesByMonitor(monitorId, metrics);
        if (defines == null || defines.isEmpty()) {
            return null;
        }
        // 将告警阈值定义从告警级别0-3数字升序排序，数字越小告警基本越高，即从最高的告警阈值开始匹配计算
        return defines.stream().sorted(Comparator.comparing(AlertDefine::getPriority))
                .collect(Collectors.groupingBy(AlertDefine::getField));
    }

    @Override
    public Page<AlertDefine> getAlertDefines(Specification<AlertDefine> specification, PageRequest pageRequest) {
        return alertDefineDao.findAll(specification, pageRequest);
    }

    @Override
    public List<AlertDefineMonitorBind> getBindAlertDefineMonitors(long alertDefineId) {
        return alertDefineBindDao.getAlertDefineBindsByAlertDefineIdEquals(alertDefineId);
    }
}
