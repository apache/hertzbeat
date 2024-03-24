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

package org.dromara.hertzbeat.collector.collect.strategy;

import com.google.common.collect.Maps;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.collector.collect.AbstractCollect;
import org.reflections.Reflections;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;

import java.lang.reflect.InvocationTargetException;
import java.util.Map;
import java.util.Set;

/**
 * Specific metrics collection factory
 *
 */
@Slf4j
@Configuration
@Order(value = Ordered.HIGHEST_PRECEDENCE + 1)
public class CollectStrategyFactory implements CommandLineRunner {
    private static final String COLLECTOR_PATH = "org.dromara.hertzbeat.collector.collect";

    /**
     * strategy container
     */
    private static Map<String, AbstractCollect> COLLECT_STRATEGY;

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
        Reflections reflections = new Reflections(COLLECTOR_PATH);
        Set<Class<? extends AbstractCollect>> concreteCollectorList = reflections.getSubTypesOf(AbstractCollect.class);
        // in order to reduce total resize
        COLLECT_STRATEGY = Maps.newHashMapWithExpectedSize(concreteCollectorList.size());

        concreteCollectorList.forEach(collector -> {
            try {
                AbstractCollect abstractCollect = collector.getConstructor().newInstance();
                COLLECT_STRATEGY.put(abstractCollect.supportProtocol(), abstractCollect);
            } catch (InstantiationException | IllegalAccessException | InvocationTargetException | NoSuchMethodException e) {
                log.error("AbstractCollect <{}> could not be instantiate...", collector.getName());
            }
        });
    }
}
