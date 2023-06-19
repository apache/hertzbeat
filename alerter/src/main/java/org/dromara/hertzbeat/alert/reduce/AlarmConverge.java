package org.dromara.hertzbeat.alert.reduce;

import lombok.RequiredArgsConstructor;
import org.dromara.hertzbeat.alert.dao.AlertConvergeDao;
import org.dromara.hertzbeat.common.cache.CacheFactory;
import org.dromara.hertzbeat.common.cache.ICacheService;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.alerter.AlertConverge;
import org.dromara.hertzbeat.common.entity.manager.TagItem;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * alarm converge 
 * 告警收敛
 * @author tom
 */
@Service
@RequiredArgsConstructor
public class AlarmConverge {
    
    private final AlertConvergeDao alertConvergeDao;
    
    /**
     * alert converge filter data
     * @param alert alert
     * @return true when not filter
     */
    @SuppressWarnings("unchecked")
    public boolean filterConverge(Alert alert) {
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
            boolean match = alertConverge.isMatchAll();
            if (!match) {
                List<TagItem> tags = alertConverge.getTags();
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
                if (match && alertConverge.getPriorities() != null && !alertConverge.getPriorities().isEmpty()) {
                    match = alertConverge.getPriorities().stream().anyMatch(item -> item != null && item == alert.getPriority());
                }
            }
            if (match) {
                
                
                break;
            }
        }
        return true;
    }
}
