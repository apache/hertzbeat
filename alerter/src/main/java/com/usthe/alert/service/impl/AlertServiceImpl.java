package com.usthe.alert.service.impl;

import com.usthe.alert.dao.AlertDao;
import com.usthe.alert.dto.AlertPriorityNum;
import com.usthe.alert.dto.AlertSummary;
import com.usthe.common.entity.alerter.Alert;
import com.usthe.alert.service.AlertService;
import com.usthe.common.util.CommonConstants;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashSet;
import java.util.List;

/**
 * Realization of Alarm Information Service 告警信息服务实现
 *
 * @author tom
 * @date 2021/12/10 15:39
 */
@Service
@Transactional(rollbackFor = Exception.class)
@Slf4j
public class AlertServiceImpl implements AlertService {

    @Autowired
    private AlertDao alertDao;

    @Override
    public void addAlert(Alert alert) throws RuntimeException {
        alertDao.save(alert);
    }

    @Override
    public Page<Alert> getAlerts(Specification<Alert> specification, PageRequest pageRequest) {
        return alertDao.findAll(specification, pageRequest);
    }

    @Override
    public void deleteAlerts(HashSet<Long> ids) {
        alertDao.deleteAlertsByIdIn(ids);
    }

    @Override
    public void editAlertStatus(Byte status, List<Long> ids) {
        alertDao.updateAlertsStatus(status, ids);
    }

    @Override
    public AlertSummary getAlertsSummary() {
        AlertSummary alertSummary = new AlertSummary();
        //Statistics on the alarm information in the alarm state
        //统计正在告警状态下的告警信息
        List<AlertPriorityNum> priorityNums = alertDao.findAlertPriorityNum();
        if (priorityNums != null) {
            for (AlertPriorityNum priorityNum : priorityNums) {
                switch (priorityNum.getPriority()) {
                    case CommonConstants
                            .ALERT_PRIORITY_CODE_WARNING:
                        alertSummary.setPriorityWarningNum(priorityNum.getNum());
                        break;
                    case CommonConstants.ALERT_PRIORITY_CODE_CRITICAL:
                        alertSummary.setPriorityCriticalNum(priorityNum.getNum());
                        break;
                    case CommonConstants.ALERT_PRIORITY_CODE_EMERGENCY:
                        alertSummary.setPriorityEmergencyNum(priorityNum.getNum());
                        break;
                    default:
                        break;
                }
            }
        }
        long total = alertDao.count();
        long dealNum = total - alertSummary.getPriorityCriticalNum()
                - alertSummary.getPriorityEmergencyNum() - alertSummary.getPriorityWarningNum();
        alertSummary.setDealNum(dealNum);
        try {
            if (total == 0) {
                alertSummary.setRate(100);
            } else {
                float rate = BigDecimal.valueOf(100 * (float) dealNum / total)
                        .setScale(2, RoundingMode.HALF_UP)
                        .floatValue();
                alertSummary.setRate(rate);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
        return alertSummary;
    }

}
