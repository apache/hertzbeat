/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.manager.config;

import jakarta.annotation.PostConstruct;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.apache.hertzbeat.warehouse.store.history.tsdb.vm.VictoriaMetricsProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Configuration class for Prometheus Proxy.
 * This class determines whether to use PrometheusProxyCollectImpl or PrometheusAutoCollectImpl
 * based on the presence of GreptimeDB or VictoriaMetrics properties.
 */
@Component
public class PrometheusProxyConfig {
    private static GreptimeProperties staticGreptimeProperties;
    private static VictoriaMetricsProperties staticVictoriaMetricsProperties;

    private final GreptimeProperties greptimeProperties;
    private final VictoriaMetricsProperties victoriaMetricsProperties;

    /**
     * Constructs the factory and injects warehouse properties.
     * Uses @Autowired(required = false) to allow these properties to be optional,
     * in case they are not configured or enabled in the warehouse module.
     *
     * @param greptimeProperties GreptimeDB configuration properties.
     * @param victoriaMetricsProperties VictoriaMetrics configuration properties.
     */
    @Autowired
    public PrometheusProxyConfig(
            @Autowired(required = false) GreptimeProperties greptimeProperties,
            @Autowired(required = false) VictoriaMetricsProperties victoriaMetricsProperties) {
        this.greptimeProperties = greptimeProperties;
        this.victoriaMetricsProperties = victoriaMetricsProperties;
    }

    /**
     * Initializes static fields with the injected properties after construction.
     * This allows the static getCollector method to access these configurations.
     */
    @PostConstruct
    private void initStatic() {
        staticGreptimeProperties = this.greptimeProperties;
        staticVictoriaMetricsProperties = this.victoriaMetricsProperties;
    }

    /**
     * Judges whether to use PrometheusProxyCollectImpl or PrometheusAutoCollectImpl
     */
    public boolean isPrometheusProxy() {
        if (staticGreptimeProperties != null && staticGreptimeProperties.enabled()) {
            return true;
        }
        if (staticVictoriaMetricsProperties != null && staticVictoriaMetricsProperties.enabled()) {
            return true;
        }
        return false;
    }


}
