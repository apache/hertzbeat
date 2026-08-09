/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

import java.nio.file.Path;
import java.util.Locale;

/** Pure embedded-H2 source-safety classification. */
final class EmbeddedH2SourceClassifier {

    private static final String H2_PREFIX = "jdbc:h2:";

    private EmbeddedH2SourceClassifier() {
    }

    static boolean isSafeEmbeddedSource(String productName, String jdbcUrl) {
        if (productName == null || !"h2".equals(productName.trim().toLowerCase(Locale.ROOT))
                || jdbcUrl == null) {
            return false;
        }
        String url = jdbcUrl.trim().toLowerCase(Locale.ROOT);
        if (!url.startsWith(H2_PREFIX) || hasUnsafeSetting(url)) {
            return false;
        }
        String location = url.substring(H2_PREFIX.length());
        if (location.startsWith("mem:")) {
            return !isRemote(location.substring("mem:".length()));
        }
        String fileLocation = location.startsWith("file:")
                ? location.substring("file:".length())
                : location;
        return !isRemote(fileLocation) && (location.startsWith("file:")
                || location.startsWith("./")
                || location.startsWith("../")
                || location.startsWith(".\\")
                || location.startsWith("..\\")
                || location.startsWith("~/")
                || location.startsWith("/")
                || isWindowsDrive(location));
    }

    static boolean matchesConfiguredSource(String configuredUrl, String actualUrl) {
        String configuredLocation = sourceLocation(configuredUrl);
        String actualLocation = sourceLocation(actualUrl);
        if (configuredLocation == null || actualLocation == null) {
            return false;
        }
        if (configuredLocation.startsWith("mem:") || actualLocation.startsWith("mem:")) {
            return configuredLocation.equals(actualLocation);
        }
        try {
            return localPath(configuredLocation).equals(localPath(actualLocation));
        } catch (RuntimeException exception) {
            return false;
        }
    }

    private static String sourceLocation(String jdbcUrl) {
        if (jdbcUrl == null || !jdbcUrl.regionMatches(true, 0, H2_PREFIX, 0, H2_PREFIX.length())) {
            return null;
        }
        String location = jdbcUrl.substring(H2_PREFIX.length()).split(";", 2)[0];
        return location.regionMatches(true, 0, "file:", 0, "file:".length())
                ? location.substring("file:".length()) : location;
    }

    private static Path localPath(String location) {
        String expanded = location.startsWith("~/") || location.startsWith("~\\")
                ? System.getProperty("user.home") + location.substring(1) : location;
        return Path.of(expanded).toAbsolutePath().normalize();
    }

    private static boolean isRemote(String location) {
        return location.contains("://") || location.startsWith("//") || location.startsWith("\\\\");
    }

    private static boolean isWindowsDrive(String location) {
        return location.length() >= 3
                && Character.isLetter(location.charAt(0))
                && location.charAt(1) == ':'
                && (location.charAt(2) == '\\' || location.charAt(2) == '/');
    }

    private static boolean hasUnsafeSetting(String url) {
        for (String setting : url.split(";")) {
            String normalized = setting.strip();
            if (normalized.startsWith("auto_server") || normalized.equals("file_lock=no")) {
                return true;
            }
        }
        return false;
    }
}
