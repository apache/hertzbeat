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

package org.apache.hertzbeat.startup.migration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.io.File;
import java.net.URISyntaxException;
import java.net.URL;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Guards the shape of the Flyway migration chain shipped by the startup module.
 * The chain is part of the release contract: 1.8.0 ended at V180 and 1.9.0 adds
 * exactly one migration per dialect, V190.
 */
class MigrationInventoryTest {

    private static final List<String> VENDORS = List.of("h2", "mysql", "postgresql");

    private static final Pattern VERSIONED_SCRIPT = Pattern.compile("^V(\\d+)__.+\\.sql$");

    private static final int LAST_RELEASED_VERSION = 180;

    private static final int CURRENT_VERSION = 190;

    private static final List<Integer> WITHDRAWN_VERSIONS = List.of(181, 182, 183);

    @Test
    @DisplayName("every dialect ends the chain with V180 followed by V190")
    void chainEndsWithLastReleasedVersionThenCurrentVersion() throws URISyntaxException {
        for (String vendor : VENDORS) {
            List<Integer> versions = versionsOf(vendor);

            assertTrue(versions.size() >= 2, () -> vendor + " must ship at least V180 and V190");
            assertEquals(CURRENT_VERSION, versions.get(versions.size() - 1),
                    () -> vendor + " must end at V" + CURRENT_VERSION + " but ends at " + versions);
            assertEquals(LAST_RELEASED_VERSION, versions.get(versions.size() - 2),
                    () -> vendor + " must apply V" + CURRENT_VERSION + " directly after the last released V"
                            + LAST_RELEASED_VERSION + " but has " + versions);
        }
    }

    @Test
    @DisplayName("the withdrawn pre-release versions V181, V182 and V183 are gone")
    void withdrawnVersionsAreAbsent() throws URISyntaxException {
        for (String vendor : VENDORS) {
            List<Integer> versions = versionsOf(vendor);
            for (Integer withdrawn : WITHDRAWN_VERSIONS) {
                assertFalse(versions.contains(withdrawn),
                        () -> vendor + " still ships the withdrawn pre-release migration V" + withdrawn);
            }
        }
    }

    @Test
    @DisplayName("all dialects ship the same versions, each exactly once")
    void allDialectsShipTheSameVersions() throws URISyntaxException {
        Map<String, List<Integer>> byVendor = new LinkedHashMap<>();
        for (String vendor : VENDORS) {
            List<Integer> versions = versionsOf(vendor);
            assertEquals(versions.size(), versions.stream().distinct().count(),
                    () -> vendor + " declares a version more than once: " + versions);
            byVendor.put(vendor, versions);
        }

        List<Integer> reference = byVendor.get(VENDORS.get(0));
        for (Map.Entry<String, List<Integer>> entry : byVendor.entrySet()) {
            assertEquals(reference, entry.getValue(),
                    () -> entry.getKey() + " diverges from " + VENDORS.get(0) + ": "
                            + entry.getValue() + " vs " + reference);
        }
    }

    /**
     * Reads the migration versions of one dialect from the packaged classpath location,
     * which is exactly what {@code spring.flyway.locations} resolves at runtime.
     *
     * @param vendor flyway vendor directory name
     * @return the versions in ascending order
     * @throws URISyntaxException when the classpath location cannot be resolved to a directory
     */
    private static List<Integer> versionsOf(String vendor) throws URISyntaxException {
        URL location = MigrationInventoryTest.class.getClassLoader().getResource("db/migration/" + vendor);
        assertNotNull(location, () -> "missing migration location db/migration/" + vendor);

        File[] files = new File(location.toURI()).listFiles();
        assertNotNull(files, () -> "db/migration/" + vendor + " is not a readable directory");

        List<Integer> versions = new ArrayList<>();
        for (File file : files) {
            Matcher matcher = VERSIONED_SCRIPT.matcher(file.getName());
            if (matcher.matches()) {
                versions.add(Integer.valueOf(matcher.group(1)));
            }
        }
        versions.sort(Integer::compareTo);
        return List.copyOf(versions);
    }

    @Test
    @DisplayName("no dialect directory holds an unversioned or misnamed script")
    void everyScriptFollowsTheVersionedNaming() throws URISyntaxException {
        for (String vendor : VENDORS) {
            URL location = MigrationInventoryTest.class.getClassLoader().getResource("db/migration/" + vendor);
            assertNotNull(location, () -> "missing migration location db/migration/" + vendor);
            File[] files = new File(location.toURI()).listFiles();
            assertNotNull(files, () -> "db/migration/" + vendor + " is not a readable directory");

            List<String> unexpected = Arrays.stream(files)
                    .map(File::getName)
                    .filter(name -> !VERSIONED_SCRIPT.matcher(name).matches())
                    .toList();
            assertTrue(unexpected.isEmpty(),
                    () -> "db/migration/" + vendor + " holds non-migration files: " + unexpected);
        }
    }
}
