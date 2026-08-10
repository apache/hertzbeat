/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Strict, credential-free identity view of one supported single-host target JDBC URL. */
final class TargetJdbcUrl {

    private static final Set<String> USER_KEYS = Set.of("user", "username");

    private final MetadataDatabaseKind kind;
    private final String connectionUrl;
    private final String canonicalUrl;
    private final String host;
    private final int port;
    private final String database;

    private TargetJdbcUrl(
            MetadataDatabaseKind kind,
            String connectionUrl,
            String canonicalUrl,
            String host,
            int port,
            String database) {
        this.kind = kind;
        this.connectionUrl = connectionUrl;
        this.canonicalUrl = canonicalUrl;
        this.host = host;
        this.port = port;
        this.database = database;
    }

    static TargetJdbcUrl parse(MetadataDatabaseKind kind, String jdbcUrl) {
        try {
            return parseStrict(Objects.requireNonNull(kind, "kind"), Objects.requireNonNull(jdbcUrl, "jdbcUrl"));
        } catch (RuntimeException invalid) {
            throw invalidUrl();
        }
    }

    String canonicalUrl() {
        return canonicalUrl;
    }

    String connectionUrl() {
        return connectionUrl;
    }

    MetadataDatabaseKind kind() {
        return kind;
    }

    String host() {
        return host;
    }

    int port() {
        return port;
    }

    String database() {
        return database;
    }

    boolean sameTarget(TargetJdbcUrl other) {
        return other != null
                && kind == other.kind
                && host.equals(other.host)
                && port == other.port
                && database.equals(other.database);
    }

    @Override
    public String toString() {
        return "TargetJdbcUrl[kind=" + kind + "]";
    }

    private static TargetJdbcUrl parseStrict(MetadataDatabaseKind kind, String jdbcUrl) {
        String prefix = switch (kind) {
            case MYSQL -> "jdbc:mysql://";
            case POSTGRESQL -> "jdbc:postgresql://";
            case H2 -> throw invalidUrl();
        };
        if (!jdbcUrl.startsWith(prefix)) {
            throw invalidUrl();
        }

        URI uri = URI.create(jdbcUrl.substring("jdbc:".length()));
        String scheme = kind == MetadataDatabaseKind.MYSQL ? "mysql" : "postgresql";
        if (!scheme.equals(uri.getScheme()) || uri.getRawUserInfo() != null || uri.getFragment() != null) {
            throw invalidUrl();
        }

        String rawHost = uri.getHost();
        int configuredPort = uri.getPort();
        if (rawHost == null || rawHost.isBlank() || configuredPort == 0 || configuredPort > 65535) {
            throw invalidUrl();
        }
        String expectedAuthority = rawHost + (configuredPort < 0 ? "" : ":" + configuredPort);
        if (!expectedAuthority.equalsIgnoreCase(uri.getRawAuthority())) {
            throw invalidUrl();
        }

        String rawPath = uri.getRawPath();
        if (rawPath == null || rawPath.length() < 2 || rawPath.charAt(0) != '/'
                || rawPath.indexOf('/', 1) >= 0) {
            throw invalidUrl();
        }
        String database = decodeDatabase(rawPath.substring(1));

        String host = rawHost.toLowerCase(Locale.ROOT);
        int port = configuredPort < 0 ? defaultPort(kind) : configuredPort;
        String query = canonicalQuery(uri.getRawQuery());
        String canonical = "jdbc:" + scheme + "://" + host + ':' + port + '/'
                + encode(database) + (query.isEmpty() ? "" : "?" + query);
        return new TargetJdbcUrl(kind, jdbcUrl, canonical, host, port, database);
    }

    private static String canonicalQuery(String rawQuery) {
        if (rawQuery == null) {
            return "";
        }
        if (rawQuery.isEmpty()) {
            throw invalidUrl();
        }
        Set<String> keys = new HashSet<>();
        List<QueryParameter> parameters = new ArrayList<>();
        for (String part : rawQuery.split("&", -1)) {
            int separator = part.indexOf('=');
            if (separator <= 0) {
                throw invalidUrl();
            }
            String key = decode(part.substring(0, separator)).toLowerCase(Locale.ROOT);
            String value = decode(part.substring(separator + 1));
            if (key.isBlank() || containsControl(key) || containsControl(value)
                    || credentialKey(key) || !keys.add(key)) {
                throw invalidUrl();
            }
            parameters.add(new QueryParameter(key, value));
        }
        parameters.sort(Comparator.comparing(QueryParameter::key));
        return parameters.stream()
                .map(parameter -> encode(parameter.key()) + '=' + encode(parameter.value()))
                .reduce((left, right) -> left + '&' + right)
                .orElseThrow(TargetJdbcUrl::invalidUrl);
    }

    private static String decode(String raw) {
        StringBuilder decoded = new StringBuilder(raw.length());
        for (int index = 0; index < raw.length();) {
            if (raw.charAt(index) != '%') {
                int codePoint = raw.codePointAt(index);
                decoded.appendCodePoint(codePoint);
                index += Character.charCount(codePoint);
                continue;
            }
            ByteArrayOutputStream escaped = new ByteArrayOutputStream();
            while (index < raw.length() && raw.charAt(index) == '%') {
                if (index + 2 >= raw.length()) {
                    throw invalidUrl();
                }
                int high = Character.digit(raw.charAt(index + 1), 16);
                int low = Character.digit(raw.charAt(index + 2), 16);
                if (high < 0 || low < 0) {
                    throw invalidUrl();
                }
                escaped.write(high << 4 | low);
                index += 3;
            }
            decoded.append(decodeUtf8(escaped.toByteArray()));
        }
        return decoded.toString();
    }

    private static String decodeUtf8(byte[] encoded) {
        try {
            CharBuffer decoded = StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(encoded));
            return decoded.toString();
        } catch (CharacterCodingException invalid) {
            throw invalidUrl();
        }
    }

    private static String encode(String value) {
        StringBuilder encoded = new StringBuilder(value.length());
        byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
        for (byte current : bytes) {
            int unsigned = current & 0xff;
            if (isUnreserved(unsigned)) {
                encoded.append((char) unsigned);
            } else {
                encoded.append('%');
                encoded.append(Character.toUpperCase(Character.forDigit(unsigned >>> 4, 16)));
                encoded.append(Character.toUpperCase(Character.forDigit(unsigned & 0x0f, 16)));
            }
        }
        return encoded.toString();
    }

    private static boolean isUnreserved(int value) {
        return value >= 'a' && value <= 'z'
                || value >= 'A' && value <= 'Z'
                || value >= '0' && value <= '9'
                || value == '-' || value == '.' || value == '_' || value == '~';
    }

    private static boolean containsStructuralCharacter(String value) {
        return containsControl(value) || value.indexOf('/') >= 0 || value.indexOf('?') >= 0 || value.indexOf('#') >= 0;
    }

    private static boolean containsControl(String value) {
        return value.codePoints().anyMatch(Character::isISOControl);
    }

    private static boolean credentialKey(String key) {
        return USER_KEYS.contains(key)
                || key.contains("password")
                || key.contains("secret")
                || key.contains("token");
    }

    static String decodeDatabase(String rawDatabase) {
        String database = decode(rawDatabase);
        if (database.isBlank() || containsStructuralCharacter(database)) {
            throw invalidUrl();
        }
        return database;
    }

    static int defaultPort(MetadataDatabaseKind kind) {
        return kind == MetadataDatabaseKind.MYSQL ? 3306 : 5432;
    }

    private static IllegalArgumentException invalidUrl() {
        return new IllegalArgumentException("Invalid target JDBC URL");
    }

    private record QueryParameter(String key, String value) {
    }
}
