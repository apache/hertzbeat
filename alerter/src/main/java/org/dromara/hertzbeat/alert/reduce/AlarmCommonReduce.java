package org.dromara.hertzbeat.alert.reduce;

import lombok.RequiredArgsConstructor;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.queue.CommonDataQueue;
import org.springframework.stereotype.Service;

/**
 * reduce alarm and send alert data
 *
 *
 */
@Service
@RequiredArgsConstructor
public class AlarmCommonReduce {
	
	private final AlarmSilenceReduce alarmSilenceReduce;
	
	private final AlarmConvergeReduce alarmConvergeReduce;
	
	private final CommonDataQueue dataQueue;
	
    public void reduceAndSendAlarm(Alert alert) {
		alert.setTimes(1);
		// converge -> silence
	    if (alarmConvergeReduce.filterConverge(alert) && alarmSilenceReduce.filterSilence(alert)) {
			dataQueue.sendAlertsData(alert);
	    }
    }
	
}
