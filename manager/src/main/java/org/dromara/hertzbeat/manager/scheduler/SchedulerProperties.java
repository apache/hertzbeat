package org.dromara.hertzbeat.manager.scheduler;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * scheduler properties config
 * @author tomsun28
 */
@Component
@ConfigurationProperties(prefix = "scheduler")
public class SchedulerProperties {
    
    private ServerProperties server;
    
    public ServerProperties getServer() {
        return server;
    }
    
    public void setServer(ServerProperties server) {
        this.server = server;
    }
    
    public static class ServerProperties {
        
        private boolean enabled = true;
        
        private int port = 1158;

        /**
         * an IdleStateEvent whose state is IdleState.ALL_IDLE will be triggered when neither read nor write 
         * was performed for the specified period of time.
         * unit: s
         */
        private int idleStateEventTriggerTime = 100;
        
        public boolean isEnabled() {
            return enabled;
        }
        
        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
        
        public int getPort() {
            return port;
        }
        
        public void setPort(int port) {
            this.port = port;
        }

        public int getIdleStateEventTriggerTime() {
            return idleStateEventTriggerTime;
        }

        public void setIdleStateEventTriggerTime(int idleStateEventTriggerTime) {
            this.idleStateEventTriggerTime = idleStateEventTriggerTime;
        }
    }
    
}
