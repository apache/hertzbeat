package org.dromara.hertzbeat.common.support.event;

import org.springframework.context.ApplicationEvent;

/**
 * the event for system config change
 * @author tom
 */
public class SystemConfigChangeEvent extends ApplicationEvent {
    
    public SystemConfigChangeEvent(Object source) {
        super(source);
    }
}
