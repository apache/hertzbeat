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

package org.apache.hertzbeat.startup;

import javax.annotation.PostConstruct;
import org.apache.hertzbeat.manager.nativex.HertzbeatRuntimeHintsRegistrar;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.ImportRuntimeHints;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * HertzBeat main application startup class.
 * This class replaces the original Manager class as the main entry point for HertzBeat application.
 */
@SpringBootApplication
        (exclude = {
//                org.springframework.boot.autoconfigure.mongo.MongoAutoConfiguration.class,
//                org.springframework.boot.autoconfigure.data.mongo.MongoDataAutoConfiguration.class,
//                org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration.class,
//                org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration.class,
                io.opentelemetry.instrumentation.spring.autoconfigure.internal.instrumentation.mongo.MongoClientInstrumentationAutoConfiguration.class
})
@EnableJpaAuditing
@EnableJpaRepositories(basePackages = {"org.apache.hertzbeat"})
@EntityScan(basePackages = {"org.apache.hertzbeat"})
@ComponentScan(basePackages = {"org.apache.hertzbeat"})
@ConfigurationPropertiesScan(basePackages = {"org.apache.hertzbeat"})
@ImportRuntimeHints(HertzbeatRuntimeHintsRegistrar.class)
@EnableAsync
@EnableScheduling
public class HertzBeatApplication {

    public static void main(String[] args) {
        SpringApplication.run(HertzBeatApplication.class, args);
    }

    @PostConstruct
    public void init() {
        // Set JNDI object factory filter for security
        System.setProperty("jdk.jndi.object.factoriesFilter", "!com.zaxxer.hikari.HikariJNDIFactory");
    }
}
