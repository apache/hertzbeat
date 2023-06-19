package org.dromara.hertzbeat.alert.reduce;

import lombok.RequiredArgsConstructor;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.queue.CommonDataQueue;
import org.springframework.stereotype.Service;

/**
 * reduce alarm and send alert data
 *
 * @author tom
 */
@Service
@RequiredArgsConstructor
public class AlarmCommonReduce {
	
	private final AlarmSilence alarmSilence;
	
	private final AlarmConverge alarmConverge;
	
	private final CommonDataQueue dataQueue;
	
    public void reduceAndSendAlarm(Alert alert) {
		// converge -> silence
	    if (alarmConverge.filterConverge(alert) && alarmSilence.filterSilence(alert)) {
			dataQueue.sendAlertsData(alert);
	    }
    }
	
}
