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

package org.apache.hertzbeat.collector.dispatch;

import org.apache.hertzbeat.common.constants.ConfigConstants;
import org.apache.hertzbeat.common.constants.SignConstants;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Schedule Distribution Task Configuration Properties
 */
@Component
@ConfigurationProperties(prefix = ConfigConstants.FunctionModuleConstants.COLLECTOR
        + SignConstants.DOT
        + ConfigConstants.FunctionModuleConstants.DISPATCH)
public class DispatchProperties {

    /**
     * Scheduling entry configuration properties
     */
    private EntranceProperties entrance;

    /**
     * Schedule Data Export Configuration Properties
     */
    private ExportProperties export;

    public EntranceProperties getEntrance() {
        return entrance;
    }

    public void setEntrance(EntranceProperties entrance) {
        this.entrance = entrance;
    }

    public ExportProperties getExport() {
        return export;
    }

    public void setExport(ExportProperties export) {
        this.export = export;
    }

    /**
     * Scheduling entry configuration properties
     * The entry can be netty information, http request, message middleware message request
     */
    public static class EntranceProperties {
        
        /**
         * netty server client config
         */
        private NettyProperties netty;
        
        public NettyProperties getNetty() {
            return netty;
        }
        
        public void setNetty(NettyProperties netty) {
            this.netty = netty;
        }


        /**
         * Netty Properties
         */
        public static class NettyProperties {
            
            /**
             * whether netty scheduling is started
             */
            private boolean enabled = false;
            
            /**
             * this collector unique identity
             * default is the host name
             */
            private String identity;

            /**
             * this collector mode
             * public: for public network, support cluster
             * private: for private network, support cloud-edge
             */
            private String mode;
            
            /**
             * connect cluster master host
             */
            private String managerHost;
            
            /**
             * connect cluster master port
             */
            private int managerPort = 1158;
            
            public boolean isEnabled() {
                return enabled;
            }
            
            public void setEnabled(boolean enabled) {
                this.enabled = enabled;
            }
            
            public String getIdentity() {
                return identity;
            }
            
            public void setIdentity(String identity) {
                this.identity = identity;
            }

            public String getMode() {
                return mode;
            }

            public void setMode(String mode) {
                this.mode = mode;
            }

            public String getManagerHost() {
                return managerHost;
            }
            
            public void setManagerHost(String managerHost) {
                this.managerHost = managerHost;
            }
            
            public int getManagerPort() {
                return managerPort;
            }
            
            public void setManagerPort(int managerPort) {
                this.managerPort = managerPort;
            }
        }
    }

    /**
     * Schedule Data Export Configuration Properties
     */
    public static class ExportProperties {

        /**
         * kafka configuration information
         */
        private KafkaProperties kafka;

        public KafkaProperties getKafka() {
            return kafka;
        }

        public void setKafka(KafkaProperties kafka) {
            this.kafka = kafka;
        }

        /**
         * Kafka Properties
         */
        public static class KafkaProperties {
            /**
             * Whether the kafka data export is started
             */
            private boolean enabled = true;

            /**
             * kafka's connection server url
             */
            private String servers = "http://127.0.0.1:2379";
            /**
             * Topic name to send data to
             */
            private String topic;

            public boolean isEnabled() {
                return enabled;
            }

            public void setEnabled(boolean enabled) {
                this.enabled = enabled;
            }

            public String getServers() {
                return servers;
            }

            public void setServers(String servers) {
                this.servers = servers;
            }

            public String getTopic() {
                return topic;
            }

            public void setTopic(String topic) {
                this.topic = topic;
            }
        }
    }
}
