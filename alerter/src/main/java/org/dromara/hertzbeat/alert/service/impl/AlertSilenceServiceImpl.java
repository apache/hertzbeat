package org.dromara.hertzbeat.alert.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.alert.dao.AlertSilenceDao;
import org.dromara.hertzbeat.alert.service.AlertSilenceService;
import org.dromara.hertzbeat.common.cache.CacheFactory;
import org.dromara.hertzbeat.common.cache.ICacheService;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.alerter.AlertSilence;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Set;

/**
 * management interface service implement for alert silence
 *
 * @author tom
 */
@Service
@Transactional(rollbackFor = Exception.class)
@Slf4j
public class AlertSilenceServiceImpl implements AlertSilenceService {

    @Autowired
    private AlertSilenceDao alertSilenceDao;

    @Override
    public void validate(AlertSilence alertSilence, boolean isModify) throws IllegalArgumentException {
        // todo
        // 兜底策略, 如果周期性情况下设置的告警静默选择日期为空, 视为全部勾选
        if (alertSilence.getType() == 1 && alertSilence.getDays() == null) {
            alertSilence.setDays(Arrays.asList((byte) 7, (byte) 1, (byte) 2, (byte) 3, (byte) 4, (byte) 5, (byte) 6));
        }
    }

    @Override
    public void addAlertSilence(AlertSilence alertSilence) throws RuntimeException {
        alertSilenceDao.save(alertSilence);
        clearAlertSilencesCache();
    }

    @Override
    public void modifyAlertSilence(AlertSilence alertSilence) throws RuntimeException {
        alertSilenceDao.save(alertSilence);
        clearAlertSilencesCache();
    }

    @Override
    public AlertSilence getAlertSilence(long silenceId) throws RuntimeException {
        return alertSilenceDao.findById(silenceId).orElse(null);
    }

    @Override
    public void deleteAlertSilences(Set<Long> silenceIds) throws RuntimeException {
        alertSilenceDao.deleteAlertSilencesByIdIn(silenceIds);
        clearAlertSilencesCache();
    }

    @Override
    public Page<AlertSilence> getAlertSilences(Specification<AlertSilence> specification, PageRequest pageRequest) {
        return alertSilenceDao.findAll(specification, pageRequest);
    }

    private void clearAlertSilencesCache() {
        ICacheService<String, Object> silenceCache = CacheFactory.getAlertSilenceCache();
        silenceCache.remove(CommonConstants.CACHE_ALERT_SILENCE);
    }
}
