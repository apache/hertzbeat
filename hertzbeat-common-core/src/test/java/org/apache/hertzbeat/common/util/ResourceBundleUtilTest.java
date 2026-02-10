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

package org.apache.hertzbeat.common.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mockStatic;
import java.util.Locale;
import java.util.MissingResourceException;
import java.util.ResourceBundle;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link ResourceBundleUtil}
 */
@ExtendWith(MockitoExtension.class)
class ResourceBundleUtilTest {

    private static final String BUNDLE_NAME = "TestBundle";

    @BeforeEach
    void setUp() {
        Locale.setDefault(Locale.US);
    }

    @Test
    void testGetBundleWithValidBundleName() {
        try (MockedStatic<ResourceBundle> mockedResourceBundle = mockStatic(ResourceBundle.class)) {
            ResourceBundle mockBundle = Mockito.mock(ResourceBundle.class);

            mockedResourceBundle.when(
                    () -> ResourceBundle.getBundle(
                            Mockito.eq(BUNDLE_NAME),
                            Mockito.any(ResourceBundle.Control.class)
                    )
            ).thenReturn(mockBundle);

            ResourceBundle bundle = ResourceBundleUtil.getBundle(BUNDLE_NAME);

            assertNotNull(bundle);
            assertEquals(mockBundle, bundle);
        }
    }

    @Test
    void testGetBundleByInvalidBundleName() {
        try (MockedStatic<ResourceBundle> mockedResourceBundle = mockStatic(ResourceBundle.class)) {
            mockedResourceBundle.when(
                    () -> ResourceBundle.getBundle(
                            Mockito.eq(BUNDLE_NAME),
                            Mockito.any(ResourceBundle.Control.class)
                    )
            ).thenThrow(new MissingResourceException("Missing bundle", "ResourceBundle", BUNDLE_NAME));

            ResourceBundle mockDefaultBundle = Mockito.mock(ResourceBundle.class);

            mockedResourceBundle.when(() -> ResourceBundle.getBundle(
                    Mockito.eq(BUNDLE_NAME),
                    Mockito.eq(Locale.US),
                    Mockito.any(ResourceBundle.Control.class))
            ).thenReturn(mockDefaultBundle);

            ResourceBundle bundle = ResourceBundleUtil.getBundle(BUNDLE_NAME);

            assertNotNull(bundle);
            assertEquals(mockDefaultBundle, bundle);
        }
    }

}
