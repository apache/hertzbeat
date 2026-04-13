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

package org.apache.hertzbeat.collector.collect.database.mysql;

import java.net.URL;
import java.security.CodeSource;
import java.util.Locale;
import org.springframework.stereotype.Component;
import org.springframework.util.ClassUtils;
import org.springframework.util.StringUtils;

/**
 * Detects whether a MySQL JDBC driver is available from the external ext-lib path.
 */
@Component
public class MysqlJdbcDriverAvailability {

    private static final String[] MYSQL_DRIVER_CLASSES = {
            "com.mysql.cj.jdbc.Driver",
            "com.mysql.jdbc.Driver"
    };

    public boolean hasMysqlJdbcDriver() {
        ClassLoader classLoader = ClassUtils.getDefaultClassLoader();
        for (String driverClass : MYSQL_DRIVER_CLASSES) {
            if (!ClassUtils.isPresent(driverClass, classLoader)) {
                continue;
            }
            try {
                if (isExternalExtLibDriver(ClassUtils.forName(driverClass, classLoader))) {
                    return true;
                }
            } catch (ClassNotFoundException ignored) {
                // Race-free enough for runtime detection: keep probing other known driver class names.
            }
        }
        return false;
    }

    boolean isExternalExtLibDriver(Class<?> driverClass) {
        String location = resolveLocation(driverClass);
        return isExtLibLocation(location);
    }

    static boolean isExtLibLocation(String location) {
        if (!StringUtils.hasText(location)) {
            return false;
        }
        String normalized = location
                .replace('\\', '/')
                .toLowerCase(Locale.ROOT);
        return normalized.contains("/ext-lib/");
    }

    private String resolveLocation(Class<?> driverClass) {
        CodeSource codeSource = driverClass.getProtectionDomain().getCodeSource();
        if (codeSource != null && codeSource.getLocation() != null) {
            return codeSource.getLocation().toExternalForm();
        }
        String resourceName = ClassUtils.convertClassNameToResourcePath(driverClass.getName()) + ".class";
        ClassLoader classLoader = driverClass.getClassLoader();
        URL resource = classLoader != null ? classLoader.getResource(resourceName) : ClassLoader.getSystemResource(resourceName);
        return resource != null ? resource.toExternalForm() : null;
    }
}
