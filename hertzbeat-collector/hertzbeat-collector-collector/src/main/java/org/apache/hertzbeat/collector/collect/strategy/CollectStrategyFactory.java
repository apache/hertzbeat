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

package org.apache.hertzbeat.collector.collect.strategy;

import java.util.ServiceLoader;
import java.util.concurrent.ConcurrentHashMap;

import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;

/**
 * Specific metrics collection factory
 */
@Configuration
@Order(value = Ordered.HIGHEST_PRECEDENCE + 1)
public class CollectStrategyFactory implements CommandLineRunner {

    /**
     * strategy container
     */
    private static final ConcurrentHashMap<String, AbstractCollect> COLLECT_STRATEGY = new ConcurrentHashMap<>();

    /**
     * get instance of this protocol collection
     * @param protocol collect protocol
     * @return implement of Metrics Collection
     */
    public static AbstractCollect invoke(String protocol) {
        return COLLECT_STRATEGY.get(protocol);
    }

    @Override
    public void run(String... args) throws Exception {
        // spi load and registry protocol and collect instance
        ServiceLoader<AbstractCollect> loader = ServiceLoader.load(AbstractCollect.class, AbstractCollect.class.getClassLoader());
        for (AbstractCollect collect : loader) {
            COLLECT_STRATEGY.put(collect.supportProtocol(), collect);
        }
    }
}
