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

import java.util.Set;

/**
 * management interface service implement for alert silence
 * @author tom
 *
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
