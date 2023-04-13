package org.dromara.hertzbeat.alert.calculate;

import org.dromara.hertzbeat.alert.dao.AlertSilenceDao;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.alerter.AlertSilence;
import org.dromara.hertzbeat.common.entity.manager.TagItem;
import org.dromara.hertzbeat.common.queue.CommonDataQueue;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

/**
 * silence alarm
 * @author tom
 * @date 2023/4/12 20:00
 */
@Service
public class SilenceAlarm {
	
	private final AlertSilenceDao alertSilenceDao;
	
	private final CommonDataQueue dataQueue;
	
	public SilenceAlarm(AlertSilenceDao alertSilenceDao, CommonDataQueue dataQueue) {
		this.alertSilenceDao = alertSilenceDao;
		this.dataQueue = dataQueue;
	}
	
	public void filterSilenceAndSendData(Alert alert) {
		List<AlertSilence> alertSilenceList = alertSilenceDao.findAll();
		for (AlertSilence alertSilence : alertSilenceList) {
			// if match the silence rule, return
			boolean match = alertSilence.isMatchAll();
			if (!match) {
				List<TagItem> tags = alertSilence.getTags();
				if (alert.getTags() != null && !alert.getTags().isEmpty()) {
					Map<String, String> alertTagMap = alert.getTags();
					match = tags.stream().anyMatch(item -> {
						String tagValue = alertTagMap.get(item.getName());
						return tagValue != null && tagValue.equals(item.getValue());
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
							return;
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
								return;
							}
						}
					}
				}
			}
		}
		dataQueue.addAlertData(alert);
	}
}
