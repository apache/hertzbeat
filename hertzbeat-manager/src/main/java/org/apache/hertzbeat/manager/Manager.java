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

package org.apache.hertzbeat.manager;

import javax.annotation.PostConstruct;
import org.apache.hertzbeat.manager.nativex.HertzbeatRuntimeHintsRegistrar;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.ImportRuntimeHints;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * start up class.
 */

@SpringBootApplication
@EnableJpaAuditing
@EnableJpaRepositories(basePackages = {"org.apache.hertzbeat"})
@EntityScan(basePackages = {"org.apache.hertzbeat"})
@ComponentScan(basePackages = {"org.apache.hertzbeat"})
@ConfigurationPropertiesScan(basePackages = {"org.apache.hertzbeat"})
@ImportRuntimeHints(HertzbeatRuntimeHintsRegistrar.class)
@EnableAsync
@EnableScheduling
public class Manager {
    public static void main(String[] args) {
        SpringApplication.run(Manager.class, args);
    }

    @PostConstruct
    public void init() {
        System.setProperty("jdk.jndi.object.factoriesFilter", "!com.zaxxer.hikari.HikariJNDIFactory");
    }
}
