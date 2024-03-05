/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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

    /**
     * server properties
     */
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
