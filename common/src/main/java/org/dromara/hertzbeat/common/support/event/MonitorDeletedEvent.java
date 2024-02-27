package org.dromara.hertzbeat.common.support.event;

import org.springframework.context.ApplicationEvent;

/**
 * the event for system config change
 * @author tom
 */
public class MonitorDeletedEvent extends ApplicationEvent {
    
    /**
     * monitoring id
     */
    private final Long monitorId;
    
    public MonitorDeletedEvent(Object source, Long monitorId) {
        super(source);
        this.monitorId = monitorId;
    }
    
    public Long getMonitorId() {
        return monitorId;
    }
}
