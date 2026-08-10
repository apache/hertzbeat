/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.net.URI;
import java.util.Locale;
import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Ephemeral endpoint-only view of a driver-reported JDBC URL. */
final class TargetJdbcEndpoint {

    private final MetadataDatabaseKind kind;
    private final String host;
    private final int port;
    private final String database;

    private TargetJdbcEndpoint(
            MetadataDatabaseKind kind, String host, int port, String database) {
        this.kind = kind;
        this.host = host;
        this.port = port;
        this.database = database;
    }

    static TargetJdbcEndpoint parse(MetadataDatabaseKind kind, String actualUrl) {
        try {
            return parseStrict(
                    Objects.requireNonNull(kind, "kind"),
                    Objects.requireNonNull(actualUrl, "actualUrl"));
        } catch (RuntimeException invalid) {
            throw new IllegalArgumentException("Invalid target JDBC endpoint");
        }
    }

    boolean matches(TargetJdbcUrl configured) {
        return configured != null
                && kind == configured.kind()
                && host.equals(configured.host())
                && port == configured.port()
                && database.equals(configured.database());
    }

    @Override
    public String toString() {
        return "TargetJdbcEndpoint[kind=" + kind + ']';
    }

    private static TargetJdbcEndpoint parseStrict(
            MetadataDatabaseKind kind, String actualUrl) {
        String prefix = switch (kind) {
            case MYSQL -> "jdbc:mysql://";
            case POSTGRESQL -> "jdbc:postgresql://";
            case H2 -> throw new IllegalArgumentException();
        };
        if (!actualUrl.startsWith(prefix)) {
            throw new IllegalArgumentException();
        }
        URI uri = URI.create(actualUrl.substring("jdbc:".length()));
        String scheme = kind == MetadataDatabaseKind.MYSQL ? "mysql" : "postgresql";
        if (!scheme.equals(uri.getScheme()) || uri.getRawUserInfo() != null || uri.getFragment() != null) {
            throw new IllegalArgumentException();
        }
        String rawHost = uri.getHost();
        int configuredPort = uri.getPort();
        if (rawHost == null || rawHost.isBlank() || configuredPort == 0 || configuredPort > 65535) {
            throw new IllegalArgumentException();
        }
        String expectedAuthority = rawHost + (configuredPort < 0 ? "" : ":" + configuredPort);
        if (!expectedAuthority.equalsIgnoreCase(uri.getRawAuthority())) {
            throw new IllegalArgumentException();
        }
        String rawPath = uri.getRawPath();
        if (rawPath == null || rawPath.length() < 2 || rawPath.charAt(0) != '/'
                || rawPath.indexOf('/', 1) >= 0) {
            throw new IllegalArgumentException();
        }
        return new TargetJdbcEndpoint(
                kind,
                rawHost.toLowerCase(Locale.ROOT),
                configuredPort < 0 ? TargetJdbcUrl.defaultPort(kind) : configuredPort,
                TargetJdbcUrl.decodeDatabase(rawPath.substring(1)));
    }
}
