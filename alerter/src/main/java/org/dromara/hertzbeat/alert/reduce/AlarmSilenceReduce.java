package org.dromara.hertzbeat.alert.reduce;

import lombok.RequiredArgsConstructor;
import org.dromara.hertzbeat.alert.dao.AlertSilenceDao;
import org.dromara.hertzbeat.common.cache.CacheFactory;
import org.dromara.hertzbeat.common.cache.ICacheService;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.alerter.AlertSilence;
import org.dromara.hertzbeat.common.entity.manager.TagItem;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

/**
 * silence alarm
 * @author tom
 *
 */
@Service
@RequiredArgsConstructor
public class AlarmSilenceReduce {
	
	private final AlertSilenceDao alertSilenceDao;
	
	/**
	 * alert silence filter data
	 * @param alert alert
	 * @return true when not filter
	 */
	@SuppressWarnings("unchecked")
	public boolean filterSilence(Alert alert) {
		ICacheService<String, Object> silenceCache = CacheFactory.getAlertSilenceCache();
		List<AlertSilence> alertSilenceList = (List<AlertSilence>) silenceCache.get(CommonConstants.CACHE_ALERT_SILENCE);
		if (alertSilenceList == null) {
			alertSilenceList = alertSilenceDao.findAll();
			silenceCache.put(CommonConstants.CACHE_ALERT_SILENCE, alertSilenceList);
		}
		for (AlertSilence alertSilence : alertSilenceList) {
			if (!alertSilence.isEnable()) {
				continue;
			}
			// if match the silence rule, return
			boolean match = alertSilence.isMatchAll();
			if (!match) {
				List<TagItem> tags = alertSilence.getTags();
				if (alert.getTags() != null && !alert.getTags().isEmpty()) {
					Map<String, String> alertTagMap = alert.getTags();
					match = tags.stream().anyMatch(item -> {
						if (alertTagMap.containsKey(item.getName())) {
							String tagValue = alertTagMap.get(item.getName());
							if (tagValue == null && item.getValue() == null) {
								return true;
							} else {
								return tagValue != null && tagValue.equals(item.getValue());
							}
						} else {
							return false;
						}
					});
				}
				if (match && alertSilence.getPriorities() != null && !alertSilence.getPriorities().isEmpty()) {
					match = alertSilence.getPriorities().stream().anyMatch(item -> item != null && item == alert.getPriority());
				}
			}
			if (match) {
				LocalDateTime nowDate = LocalDateTime.now();
				if (alertSilence.getType() == 0) {
					// once time
					if (alertSilence.getPeriodStart() != null && alertSilence.getPeriodEnd() != null) {
						if (nowDate.isAfter(alertSilence.getPeriodStart().toLocalDateTime())
								&& nowDate.isBefore(alertSilence.getPeriodEnd().toLocalDateTime())) {
							int times = alertSilence.getTimes() == null ? 0 : alertSilence.getTimes();
							alertSilence.setTimes(times + 1);
							alertSilenceDao.save(alertSilence);
							return false;
						}
					}
				} else if (alertSilence.getType() == 1) {
					// cyc time
					int currentDayOfWeek = nowDate.toLocalDate().getDayOfWeek().getValue();
					if (alertSilence.getDays() != null && !alertSilence.getDays().isEmpty()) {
						boolean dayMatch = alertSilence.getDays().stream().anyMatch(item -> item == currentDayOfWeek);
						if (dayMatch && alertSilence.getPeriodStart() != null && alertSilence.getPeriodEnd() != null ) {
							LocalTime nowTime = nowDate.toLocalTime();
							
							if (nowTime.isAfter(alertSilence.getPeriodStart().toLocalTime())
									&& nowTime.isBefore(alertSilence.getPeriodEnd().toLocalTime())) {
								int times = alertSilence.getTimes() == null ? 0 : alertSilence.getTimes();
								alertSilence.setTimes(times + 1);
								alertSilenceDao.save(alertSilence);
								return false;
							}
						}
					}
				}
			}
		}
		return true;
	}
}
