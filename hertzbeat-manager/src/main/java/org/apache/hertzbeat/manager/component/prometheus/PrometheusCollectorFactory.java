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

package org.apache.hertzbeat.manager.component.prometheus;

import org.apache.hertzbeat.collector.collect.prometheus.PrometheusAutoCollectImpl;
import org.apache.hertzbeat.collector.collect.prometheus.PrometheusCollect;
import org.apache.hertzbeat.collector.collect.prometheus.PrometheusProxyCollectImpl;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.apache.hertzbeat.warehouse.store.history.tsdb.vm.VictoriaMetricsProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;

/**
 * Factory class to get the appropriate Prometheus collector implementation.
 * It decides based on whether GreptimeDB or VictoriaMetrics is enabled in the warehouse configuration.
 */
@Component
public class PrometheusCollectorFactory {

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
    public PrometheusCollectorFactory(
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
     * Gets the appropriate Prometheus collector.
     * If GreptimeDB or VictoriaMetrics is enabled (checked in that order),
     * it returns an instance of {@link PrometheusProxyCollectImpl}.
     * Otherwise, it defaults to {@link PrometheusAutoCollectImpl}.
     *
     * @param metrics The metrics configuration (currently not used for collector type decision but kept for API consistency).
     * @return An instance of {@link PrometheusCollect}.
     */
    public static PrometheusCollect getCollector(Metrics metrics) {
        boolean useProxyImpl = staticGreptimeProperties != null && staticGreptimeProperties.enabled();

        if (!useProxyImpl && staticVictoriaMetricsProperties != null && staticVictoriaMetricsProperties.enabled()) {
            useProxyImpl = true;
        }

        if (useProxyImpl) {
            return PrometheusProxyCollectImpl.getInstance();
        }
        
        return new PrometheusAutoCollectImpl();
    }
}