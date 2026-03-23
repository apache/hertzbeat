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

package org.apache.hertzbeat.collector.nativex;

import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.core.NativeDetector;

/**
 * Applies collector defaults without forking {@code application.yml}.
 */
public final class NativeCollectorDefaults {

    static final String AUTOCONFIGURE_EXCLUDE_PROPERTY = "spring.autoconfigure.exclude";
    static final String JVM_AUTOCONFIGURE_EXCLUDES = String.join(",",
            "org.springframework.boot.autoconfigure.mongo.MongoAutoConfiguration",
            "org.springframework.boot.autoconfigure.data.mongo.MongoDataAutoConfiguration",
            "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration",
            "org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration");
    static final String NATIVE_AUTOCONFIGURE_EXCLUDES = String.join(",",
            JVM_AUTOCONFIGURE_EXCLUDES,
            "org.springframework.boot.data.jpa.autoconfigure.DataJpaRepositoriesAutoConfiguration",
            "org.springframework.boot.jdbc.autoconfigure.DataSourceInitializationAutoConfiguration",
            "org.springframework.boot.jdbc.autoconfigure.DataSourceTransactionManagerAutoConfiguration",
            "org.springframework.boot.jdbc.autoconfigure.health.DataSourceHealthContributorAutoConfiguration",
            "org.springframework.boot.jdbc.autoconfigure.metrics.DataSourcePoolMetricsAutoConfiguration",
            "org.springframework.boot.tomcat.autoconfigure.metrics.TomcatMetricsAutoConfiguration");

    private NativeCollectorDefaults() {
    }

    public static void applyTo(SpringApplication application) {
        application.setDefaultProperties(defaultProperties(NativeDetector.inNativeImage()));
    }

    static Map<String, Object> defaultProperties(boolean nativeImage) {
        return Map.of(
                AUTOCONFIGURE_EXCLUDE_PROPERTY,
                nativeImage ? NATIVE_AUTOCONFIGURE_EXCLUDES : JVM_AUTOCONFIGURE_EXCLUDES);
    }
}
