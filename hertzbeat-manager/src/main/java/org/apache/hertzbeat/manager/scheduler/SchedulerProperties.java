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

package org.apache.hertzbeat.manager.scheduler;

import lombok.Getter;
import lombok.Setter;
import org.apache.hertzbeat.common.constants.ConfigConstants;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * scheduler properties config
 */

@Getter
@Setter
@Component
@ConfigurationProperties(prefix =
        ConfigConstants.FunctionModuleConstants.SCHEDULER)
public class SchedulerProperties {
    
    private ServerProperties server;

    /**
     * server properties
     */
    @Getter
    @Setter
    public static class ServerProperties {
        
        private boolean enabled = true;
        
        private int port = 1158;

        /**
         * an IdleStateEvent whose state is IdleState.ALL_IDLE will be triggered when neither read nor write 
         * was performed for the specified period of time.
         * unit: s
         */
        private int idleStateEventTriggerTime = 100;

    }
    
}
