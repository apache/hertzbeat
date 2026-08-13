/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.stream.Stream;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class TargetJdbcUrlTest {

    @Test
    void mysqlUrlIsCanonicalWithoutChangingTheOriginalConnectionInput() {
        String original = "jdbc:mysql://DB.Example:3306/hertzbeat?sslMode=VERIFY_IDENTITY&connectTimeout=1000";

        TargetJdbcUrl parsed = TargetJdbcUrl.parse(MetadataDatabaseKind.MYSQL, original);

        assertThat(parsed.host()).isEqualTo("db.example");
        assertThat(parsed.port()).isEqualTo(3306);
        assertThat(parsed.database()).isEqualTo("hertzbeat");
        assertThat(parsed.canonicalUrl()).isEqualTo(
                "jdbc:mysql://db.example:3306/hertzbeat?connecttimeout=1000&sslmode=VERIFY_IDENTITY");
        assertThat(original).isEqualTo(
                "jdbc:mysql://DB.Example:3306/hertzbeat?sslMode=VERIFY_IDENTITY&connectTimeout=1000");
    }

    @Test
    void postgresIpv6AndEncodedDatabaseHaveOneStableCanonicalForm() {
        TargetJdbcUrl parsed = TargetJdbcUrl.parse(
                MetadataDatabaseKind.POSTGRESQL,
                "jdbc:postgresql://[2001:DB8::1]/hertz%62eat?ApplicationName=Hertz%20Beat");

        assertThat(parsed.host()).isEqualTo("[2001:db8::1]");
        assertThat(parsed.port()).isEqualTo(5432);
        assertThat(parsed.database()).isEqualTo("hertzbeat");
        assertThat(parsed.canonicalUrl()).isEqualTo(
                "jdbc:postgresql://[2001:db8::1]:5432/hertzbeat?applicationname=Hertz%20Beat");
    }

    @Test
    void queryOrderAndEquivalentPercentEncodingDoNotChangeCanonicalIdentityInput() {
        TargetJdbcUrl first = TargetJdbcUrl.parse(
                MetadataDatabaseKind.POSTGRESQL,
                "jdbc:postgresql://db.example/hertzbeat?sslmode=require&ApplicationName=Hertz%20Beat");
        TargetJdbcUrl second = TargetJdbcUrl.parse(
                MetadataDatabaseKind.POSTGRESQL,
                "jdbc:postgresql://DB.EXAMPLE:5432/hertz%62eat?applicationname=Hertz%20Beat&sslmode=require");

        assertThat(first.canonicalUrl()).isEqualTo(second.canonicalUrl());
        assertThat(first.sameTarget(second)).isTrue();
    }

    @ParameterizedTest
    @MethodSource("credentialUrls")
    void credentialsInAuthorityOrDecodedQueryKeysAreRejected(
            MetadataDatabaseKind kind, String url) {
        assertRejected(kind, url);
    }

    @ParameterizedTest
    @MethodSource("ambiguousUrls")
    void ambiguousOrUnsupportedUrlFormsAreRejected(
            MetadataDatabaseKind kind, String url) {
        assertRejected(kind, url);
    }

    @Test
    void safeProjectionNeverContainsEndpointOrDatabase() {
        TargetJdbcUrl parsed = TargetJdbcUrl.parse(
                MetadataDatabaseKind.MYSQL,
                "jdbc:mysql://private.example/hertzbeat?sslMode=VERIFY_IDENTITY");

        assertThat(parsed.toString())
                .isEqualTo("TargetJdbcUrl[kind=MYSQL]")
                .doesNotContain("private.example", "hertzbeat", "sslMode");
    }

    private static Stream<Arguments> credentialUrls() {
        return Stream.of(
                Arguments.of(MetadataDatabaseKind.MYSQL,
                        "jdbc:mysql://operator:secret@db.example/hertzbeat"),
                Arguments.of(MetadataDatabaseKind.POSTGRESQL,
                        "jdbc:postgresql://db.example/hertzbeat?user=operator"),
                Arguments.of(MetadataDatabaseKind.POSTGRESQL,
                        "jdbc:postgresql://db.example/hertzbeat?UsErNaMe=operator"),
                Arguments.of(MetadataDatabaseKind.MYSQL,
                        "jdbc:mysql://db.example/hertzbeat?%75ser=operator"),
                Arguments.of(MetadataDatabaseKind.MYSQL,
                        "jdbc:mysql://db.example/hertzbeat?pass%77ord=secret"),
                Arguments.of(MetadataDatabaseKind.POSTGRESQL,
                        "jdbc:postgresql://db.example/hertzbeat?sslpassword=secret"),
                Arguments.of(MetadataDatabaseKind.MYSQL,
                        "jdbc:mysql://db.example/hertzbeat?trustCertificateKeyStorePassword=secret"),
                Arguments.of(MetadataDatabaseKind.MYSQL,
                        "jdbc:mysql://db.example/hertzbeat?clientCertificateKeyStorePassword=secret"),
                Arguments.of(MetadataDatabaseKind.POSTGRESQL,
                        "jdbc:postgresql://db.example/hertzbeat?client%53ecret=secret"),
                Arguments.of(MetadataDatabaseKind.POSTGRESQL,
                        "jdbc:postgresql://db.example/hertzbeat?accessToken=secret"));
    }

    private static Stream<Arguments> ambiguousUrls() {
        return Stream.of(
                Arguments.of(MetadataDatabaseKind.MYSQL,
                        "jdbc:postgresql://db.example/hertzbeat"),
                Arguments.of(MetadataDatabaseKind.POSTGRESQL,
                        "jdbc:mysql://db.example/hertzbeat"),
                Arguments.of(MetadataDatabaseKind.MYSQL,
                        "jdbc:mysql:loadbalance://db.example/hertzbeat"),
                Arguments.of(MetadataDatabaseKind.MYSQL,
                        "jdbc:mysql:replication://db.example/hertzbeat"),
                Arguments.of(MetadataDatabaseKind.POSTGRESQL,
                        "jdbc:postgresql://db-a.example,db-b.example/hertzbeat"),
                Arguments.of(MetadataDatabaseKind.MYSQL,
                        "jdbc:mysql:///hertzbeat"),
                Arguments.of(MetadataDatabaseKind.MYSQL,
                        "jdbc:mysql://db.example/"),
                Arguments.of(MetadataDatabaseKind.POSTGRESQL,
                        "jdbc:postgresql://db.example/hertzbeat/other"),
                Arguments.of(MetadataDatabaseKind.POSTGRESQL,
                        "jdbc:postgresql://db.example:0/hertzbeat"),
                Arguments.of(MetadataDatabaseKind.POSTGRESQL,
                        "jdbc:postgresql://db.example:65536/hertzbeat"),
                Arguments.of(MetadataDatabaseKind.MYSQL,
                        "jdbc:mysql://db.example/hertzbeat?ssl=true&SSL=false"),
                Arguments.of(MetadataDatabaseKind.MYSQL,
                        "jdbc:mysql://db.example/hertzbeat?ssl=true&%73sl=false"),
                Arguments.of(MetadataDatabaseKind.MYSQL,
                        "jdbc:mysql://db.example/hertzbeat?bad=%ZZ"),
                Arguments.of(MetadataDatabaseKind.POSTGRESQL,
                        "jdbc:postgresql://db.example/hertzbeat#fragment"));
    }

    private static void assertRejected(MetadataDatabaseKind kind, String url) {
        assertThatThrownBy(() -> TargetJdbcUrl.parse(kind, url))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid target JDBC URL");
    }
}
