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

package org.apache.hertzbeat.automated.testing.core;

import lombok.Data;
import lombok.Getter;
import lombok.ToString;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Builder;
import org.apache.hertzbeat.automated.testing.pages.monitoring.monitors.MonitorsEditPage;
import org.yaml.snakeyaml.Yaml;

import java.io.IOException;
import java.io.InputStream;

/**
 * generic configuration class for create monitor task,
 * two ways: 1. create instance  2. load yaml file
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MonitorsEditConfig {
    private String targetHost;
    private String taskName;
    private Integer port;
    private String databaseName;
    private String username;
    private String password;
    private Advanced advanced = new Advanced();
    private Collector collector = new Collector();
    private Integer intervals;
    private String bindLabelsKey;
    private String bindLabelsValue;
    private String bindAnnotationKey;
    private String bindAnnotationValue;
    private String description;

    /**
     * advanced config
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class Advanced {
        private Integer queryTimeout;
        private String url;
        private Boolean enableSshTunnel;
        private String sshHost;
        private Integer sshPort;
        private Integer sshTimeout;
        private String sshUsername;
        private String sshPassword;
        private Boolean shareSshConnection;
        private String sshPrivateKey;
        private String sshPrivateKeyPassPhrase;
    }

    /**
     * collector config
     */
    @Getter
    @AllArgsConstructor
    @NoArgsConstructor
    @ToString
    public static class Collector {
        private String collectorName;
        private MonitorsEditPage.CollectorEnum collectorEnum;

        public void setCollectorName(String collectorName) {
            this.collectorName = collectorName;
            this.collectorEnum = mappingCollectorEnum(collectorName);
        }

        private static MonitorsEditPage.CollectorEnum mappingCollectorEnum(String collectorName) {
            for (MonitorsEditPage.CollectorEnum value : MonitorsEditPage.CollectorEnum.values()) {
                if (value.getDesc().equals(collectorName)) {
                    return value;
                }
            }
            return null;
        }

        public static CollectorBuilder builder() {
            return new CollectorBuilder();
        }

        /**
         * collector builder
         */
        public static class CollectorBuilder {
            private String collectorName;
            private MonitorsEditPage.CollectorEnum collectorEnum;

            public CollectorBuilder collectorName(String collectorName) {
                this.collectorName = collectorName;
                this.collectorEnum = mappingCollectorEnum(collectorName);
                return this;
            }

            public Collector build() {
                return new Collector(this.collectorName, this.collectorEnum);
            }
        }
    }

    /**
     * load yaml file
     */
    public static MonitorsEditConfig yamlLoadAs(String monitorType) {
        Yaml yaml = new Yaml();
        try (InputStream inputStream = MonitorsEditConfig.class.getClassLoader()
                .getResourceAsStream(String.format("edit/%s.yml", monitorType.toLowerCase()))) {
            return yaml.loadAs(inputStream, MonitorsEditConfig.class);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

}
