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

package org.apache.hertzbeat.collector;

import jakarta.annotation.PostConstruct;
import org.apache.hertzbeat.collector.nativex.CollectorRuntimeHintsRegistrar;
import org.apache.hertzbeat.collector.nativex.NativeCollectorDefaults;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.ImportRuntimeHints;

/**
 * collector startup
 */
@ComponentScan(basePackages = {"org.apache.hertzbeat"})
@ConfigurationPropertiesScan(basePackages = {"org.apache.hertzbeat"})
@SpringBootApplication
@ImportRuntimeHints(CollectorRuntimeHintsRegistrar.class)
public class Collector {
    public static void main(String[] args) {
        SpringApplication application = new SpringApplication(Collector.class);
        NativeCollectorDefaults.applyTo(application);
        application.run(args);
    }

    @PostConstruct
    public void init() {
        System.setProperty("jdk.jndi.object.factoriesFilter", "!com.zaxxer.hikari.HikariJNDIFactory");
        if (System.getProperty("arrow.allocation.manager.type") == null
                && System.getenv("ARROW_ALLOCATION_MANAGER_TYPE") == null) {
            System.setProperty("arrow.allocation.manager.type", "Netty");
        }
    }
}
