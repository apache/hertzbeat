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

package org.apache.hertzbeat.common.support;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.lang.reflect.InvocationTargetException;
import java.net.URL;
import java.net.URLConnection;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.PropertyResourceBundle;
import java.util.ResourceBundle;

/**
 * i18n resource bundle control
 */

public class ResourceBundleUtf8Control extends ResourceBundle.Control {

    private static final String JAVA_CLASS = "java.class";
    private static final String JAVA_PROPERTIES = "java.properties";
    private static final String SPILT = "://";

    @Override
    public ResourceBundle newBundle(String baseName, Locale locale, String format, ClassLoader loader, boolean reload)
            throws IllegalAccessException, InstantiationException, IOException {

        String bundleName = toBundleName(baseName, locale);
        ResourceBundle bundle = null;
        if (JAVA_CLASS.equals(format)) {
            try {
                @SuppressWarnings("unchecked")
                Class<? extends ResourceBundle> bundleClass =
                        (Class<? extends ResourceBundle>) loader.loadClass(bundleName);

                // If the class isn't a ResourceBundle subclass, throw a
                // ClassCastException.
                if (ResourceBundle.class.isAssignableFrom(bundleClass)) {
                    bundle = bundleClass.getDeclaredConstructor().newInstance();
                } else {
                    throw new ClassCastException(bundleClass.getName()
                            + " cannot be cast to ResourceBundle");
                }
            } catch (ClassNotFoundException ignored) {}
            catch (InvocationTargetException | NoSuchMethodException e) {
                throw new RuntimeException(e);
            }
	} else if (JAVA_PROPERTIES.equals(format)) {
            final String resourceName = toResourceName0(bundleName);
            if (resourceName == null) {
                return null;
            }
	    InputStream stream = getResourceInputStream(loader, resourceName, reload);

            if (stream != null) {
                try (stream) {
                    bundle = new PropertyResourceBundle(new InputStreamReader(stream, StandardCharsets.UTF_8));
                }
            }
        } else {
            throw new IllegalArgumentException("unknown format: " + format);
        }
        return bundle;
    }

    private String toResourceName0(String bundleName) {
        // application protocol check
        if (bundleName.contains(SPILT)) {
            return null;
        } else {
            return toResourceName(bundleName, "properties");
        }
    }

    private InputStream getResourceInputStream(ClassLoader classLoader, String resourceName, boolean reloadFlag) throws IOException {

        InputStream is = null;

        if (reloadFlag) {
            URL url = classLoader.getResource(resourceName);
            if (url != null) {
                URLConnection connection = url.openConnection();
                if (connection != null) {
                    // Disable caches to get fresh data for reloading.
                    connection.setUseCaches(false);
                    is = connection.getInputStream();
                }
            }
        } else {
            is = classLoader.getResourceAsStream(resourceName);
        }

        return is;
    }

}
