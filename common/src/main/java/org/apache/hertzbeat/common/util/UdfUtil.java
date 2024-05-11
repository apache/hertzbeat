/*
 *
 *  * Licensed to the Apache Software Foundation (ASF) under one or more
 *  * contributor license agreements.  See the NOTICE file distributed with
 *  * this work for additional information regarding copyright ownership.
 *  * The ASF licenses this file to You under the Apache License, Version 2.0
 *  * (the "License"); you may not use this file except in compliance with
 *  * the License.  You may obtain a copy of the License at
 *  *
 *  *     http://www.apache.org/licenses/LICENSE-2.0
 *  *
 *  * Unless required by applicable law or agreed to in writing, software
 *  * distributed under the License is distributed on an "AS IS" BASIS,
 *  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  * See the License for the specific language governing permissions and
 *  * limitations under the License.
 *
 */

package org.apache.hertzbeat.common.util;

import java.io.File;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLClassLoader;
import java.util.Arrays;
import java.util.List;
import java.util.jar.JarFile;
import java.util.jar.Manifest;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;

/**
 * UdfUtil
 */
@Slf4j
public class UdfUtil {
    public static URLClassLoader getClassLoader(String path) {
        List<String> jars = getAllJars(path);

        if (jars == null) {
            return null;
        }

        URL[] urls = jars.stream().map(jar -> {
            try {
                return new File(jar).toURI().toURL();
            } catch (MalformedURLException e) {
                log.error("getClassLoader error", e);
            }
            return null;
        }).toArray(URL[]::new);

        ClassLoader systemClassLoader = ClassLoader.getSystemClassLoader();
        try (URLClassLoader urlClassLoader = new URLClassLoader(urls, systemClassLoader)) {
            return urlClassLoader;
        } catch (Exception e) {
            log.error("getClassLoader error", e);
        }
        return null;
    }

    private static List<String> getAllJars(String path) {
        File file = new File(path);
        File[] files = file.listFiles();
        if (files == null) {
            return null;
        }
        return Arrays.stream(files)
                .filter(f -> f.getName().endsWith(".jar"))
                .map(File::getAbsolutePath)
                .collect(Collectors.toList());
    }

    public static List<String> getAllClassNamesFromJar(String jarFilePath) {
        try (JarFile jarFile = new JarFile(jarFilePath)) {
            return jarFile.stream()
                    .filter(jarEntry -> jarEntry.getName().endsWith(".class"))
                    .filter(jarEntry -> !jarEntry.getName().contains("org/apache/hertzbeat/udf/AfterAlertUdf"))
                    .map(jarEntry -> jarEntry.getName().replace("/", ".").replace(".class", ""))
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("getAllClassNamesFromJar error", e);
        }
        return null;
    }
}
