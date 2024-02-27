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

package org.dromara.hertzbeat.manager.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * status page properties
 * @author tom
 */
@ConfigurationProperties(prefix = "status")
@Component
public class StatusProperties {

    /**
     * calculate component status properties
     */
    private CalculateProperties calculate;

    public CalculateProperties getCalculate() {
        return calculate;
    }

    public void setCalculate(CalculateProperties calculate) {
        this.calculate = calculate;
    }

    /**
     * calculate component status properties
     */
    public static class CalculateProperties {

        /**
         * the component status calculate interval(s)
         */
        private Integer interval = 300;

        public Integer getInterval() {
            return interval;
        }

        public void setInterval(Integer interval) {
            this.interval = interval;
        }
    }

}
