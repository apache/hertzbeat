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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import java.io.IOException;
import java.util.Locale;
import java.util.ResourceBundle;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link ResourceBundleUtf8Control}
 */
class ResourceBundleUtf8ControlTest {

    @Test
    void testNewBundleWithPropertiesFormat() throws IllegalAccessException, InstantiationException, IOException {

        ResourceBundle.Control control = new ResourceBundleUtf8Control();
        ClassLoader loader = getClass().getClassLoader();
        String baseName = "msg";

        ResourceBundle bundle = control.newBundle(baseName, Locale.ENGLISH, "java.properties", loader, false);
        assertNotNull(bundle);
        assertEquals("Hello, World!", bundle.getString("hello"));

        bundle = control.newBundle(baseName, Locale.ROOT, "java.properties", loader, false);
        assertNotNull(bundle);
        assertEquals("你好", bundle.getString("hello"));
    }

    @Test
    void testNewBundleWithClassFormat() throws IllegalAccessException, InstantiationException, IOException {

        ResourceBundle.Control control = new ResourceBundleUtf8Control();
        ClassLoader loader = getClass().getClassLoader();
        String baseName = "dummyClassBundle";

        ResourceBundle bundle = control.newBundle(baseName, Locale.ENGLISH, "java.class", loader, false);
        //because not have an actual class, bundle should be null
        assertNull(bundle);
    }

    @Test
    void testReloading() throws IllegalAccessException, InstantiationException, IOException {
        ResourceBundle.Control control = new ResourceBundleUtf8Control();
        ClassLoader loader = getClass().getClassLoader();
        String baseName = "msg";

        // Test with reload flag
        ResourceBundle bundle = control.newBundle(baseName, Locale.ENGLISH, "java.properties", loader, true);
        assertNotNull(bundle);
        assertEquals("Hello, World!", bundle.getString("hello"));
    }

}
