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
        
        private boolean enabled = false;
        
        private int port = 1158;
        
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
    }
    
}
