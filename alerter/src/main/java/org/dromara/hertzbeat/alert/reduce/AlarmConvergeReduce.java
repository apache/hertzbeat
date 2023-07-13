package org.dromara.hertzbeat.alert.reduce;

import org.dromara.hertzbeat.alert.dao.AlertConvergeDao;
import org.dromara.hertzbeat.common.cache.CacheFactory;
import org.dromara.hertzbeat.common.cache.ICacheService;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.alerter.AlertConverge;
import org.dromara.hertzbeat.common.entity.manager.TagItem;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

/**
 * alarm converge
 * 告警收敛
 *
 * @author tom
 */
@Service
public class AlarmConvergeReduce {

    private final AlertConvergeDao alertConvergeDao;

    private final Map<Integer, Alert> converageAlertMap;

    private final Map<Integer, Alert> lastStateAlertMap;

    public AlarmConvergeReduce(AlertConvergeDao alertConvergeDao) {
        this.alertConvergeDao = alertConvergeDao;
        this.converageAlertMap = new ConcurrentHashMap<>(16);
        this.lastStateAlertMap = new ConcurrentHashMap<>(16);
    }

    /**
     * currentAlert converge filter data
     *
     * @param currentAlert currentAlert
     * @return true when not filter
     */
    @SuppressWarnings("unchecked")
    public boolean filterConverge(Alert currentAlert) {
        // ignore ALERT_STATUS_CODE_RESTORED
        if (currentAlert.getStatus() == CommonConstants.ALERT_STATUS_CODE_RESTORED) {
            int alertStateHash = getAlertStateHash(currentAlert);
            lastStateAlertMap.put(alertStateHash, currentAlert);
            return true;
        }
        ICacheService<String, Object> convergeCache = CacheFactory.getAlertConvergeCache();
        List<AlertConverge> alertConvergeList = (List<AlertConverge>) convergeCache.get(CommonConstants.CACHE_ALERT_CONVERGE);
        if (alertConvergeList == null) {
            alertConvergeList = alertConvergeDao.findAll();
            // matchAll is in the last
            alertConvergeList.sort((item1, item2) -> {
                if (item1.isMatchAll()) {
                    return 1;
                } else if (item2.isMatchAll()) {
                    return -1;
                } else {
                    return 0;
                }
            });
            convergeCache.put(CommonConstants.CACHE_ALERT_CONVERGE, alertConvergeList);
        }
        for (AlertConverge alertConverge : alertConvergeList) {
            if (!alertConverge.isEnable()) {
                continue;
            }
            boolean match = alertConverge.isMatchAll();
            if (!match) {
                List<TagItem> tags = alertConverge.getTags();
                if (currentAlert.getTags() != null && !currentAlert.getTags().isEmpty()) {
                    Map<String, String> alertTagMap = currentAlert.getTags();
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
                if (match && alertConverge.getPriorities() != null && !alertConverge.getPriorities().isEmpty()) {
                    match = alertConverge.getPriorities().stream().anyMatch(item -> item != null && item == currentAlert.getPriority());
                }
            }
            if (match) {
                return matchAccordingInterval(alertConverge, currentAlert) && matchAccordingState(alertConverge, currentAlert);
            }
        }
        return true;
    }

    /**
     *
     * @param alertConverge alertConverge
     * @param currentAlert
     * @return true when not filter by coverage interval
     */
    private boolean matchAccordingInterval(AlertConverge alertConverge, Alert currentAlert) {
        long evalInterval = alertConverge.getEvalInterval() * 1000;
        long now = System.currentTimeMillis();
        if (evalInterval <= 0) {
            return true;
        }
        int alertHash = getAlertHash(currentAlert);
        Alert preAlert = converageAlertMap.get(alertHash);
        if (preAlert == null) {
            currentAlert.setTimes(1);
            currentAlert.setFirstAlarmTime(now);
            currentAlert.setLastAlarmTime(now);
            converageAlertMap.put(alertHash, currentAlert.clone());
            return true;
        } else {
            if (now - preAlert.getFirstAlarmTime() < evalInterval) {
                preAlert.setTimes(preAlert.getTimes() + 1);
                preAlert.setLastAlarmTime(now);
                return false;
            } else {
                currentAlert.setTimes(preAlert.getTimes());
                if (preAlert.getTimes() == 1) {
                    currentAlert.setFirstAlarmTime(now);
                } else {
                    currentAlert.setFirstAlarmTime(preAlert.getFirstAlarmTime());
                }
                currentAlert.setLastAlarmTime(now);
                preAlert.setFirstAlarmTime(now);
                preAlert.setLastAlarmTime(now);
                preAlert.setTimes(1);
                return true;
            }
        }
    }


    /**
     *
     * @param alertConverge
     * @param currentAlert
     * @return true when not filter by alert's priority and status
     */
    private boolean matchAccordingState(AlertConverge alertConverge, Alert currentAlert) {
        if ("N".equals(alertConverge.getNotifyWhenStateChange())) {
            return true;
        }
        int alertStateHash = getAlertStateHash(currentAlert);
        if (lastStateAlertMap.containsKey(alertStateHash) && lastStateAlertMap.get(alertStateHash) != null) {
            Alert preAlert = lastStateAlertMap.get(alertStateHash);
            lastStateAlertMap.put(alertStateHash, currentAlert);
            return !(preAlert.getStatus() == currentAlert.getStatus() && preAlert.getPriority() == currentAlert.getPriority());
        } else {
            lastStateAlertMap.put(alertStateHash, currentAlert);
            return true;
        }
    }

    /**
     *
     * @param alert
     * @return alertHash that bis used by alert coverage
     */
    private int getAlertHash(Alert alert) {
        return Objects.hash(alert.getPriority())
                + Arrays.hashCode(alert.getTags().keySet().toArray(new String[0]))
                + Arrays.hashCode(alert.getTags().values().toArray(new String[0]));
    }

    /**
     *
     * @param alert
     * @return alertStateHash that bis used by alert coverage
     */
    private int getAlertStateHash(Alert alert) {
        return Arrays.hashCode(alert.getTags().keySet().toArray(new String[0]))
                + Arrays.hashCode(alert.getTags().values().toArray(new String[0]));
    }

}
