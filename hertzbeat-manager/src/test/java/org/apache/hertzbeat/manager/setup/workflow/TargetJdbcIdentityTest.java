/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;

import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.junit.jupiter.api.Test;

class TargetJdbcIdentityTest {

    @Test
    void identityIsDeterministicLowercaseSha256() {
        TargetJdbcUrl target = TargetJdbcUrl.parse(
                MetadataDatabaseKind.POSTGRESQL,
                "jdbc:postgresql://db.example/hertzbeat?sslmode=require");

        String first = TargetJdbcIdentity.hash(target, "operator", "hertzbeat", "public");
        String second = TargetJdbcIdentity.hash(target, "operator", "hertzbeat", "public");

        assertThat(first).isEqualTo(second).matches("[0-9a-f]{64}");
    }

    @Test
    void lengthFramingPreventsDelimiterAmbiguity() {
        TargetJdbcUrl target = TargetJdbcUrl.parse(
                MetadataDatabaseKind.MYSQL,
                "jdbc:mysql://db.example/hertzbeat");

        String first = TargetJdbcIdentity.hash(target, "ab", "c", null);
        String second = TargetJdbcIdentity.hash(target, "a", "bc", null);

        assertThat(first).isNotEqualTo(second);
    }

    @Test
    void everyIdentityFieldParticipatesWithoutAcceptingCredentials() {
        TargetJdbcUrl mysql = TargetJdbcUrl.parse(
                MetadataDatabaseKind.MYSQL,
                "jdbc:mysql://db.example/hertzbeat");
        String baseline = TargetJdbcIdentity.hash(mysql, "operator", "hertzbeat", null);

        assertThat(TargetJdbcIdentity.hash(mysql, "other", "hertzbeat", null)).isNotEqualTo(baseline);
        assertThat(TargetJdbcIdentity.hash(mysql, "operator", "other", null)).isNotEqualTo(baseline);
        assertThat(TargetJdbcIdentity.hash(
                TargetJdbcUrl.parse(MetadataDatabaseKind.MYSQL, "jdbc:mysql://other.example/hertzbeat"),
                "operator", "hertzbeat", null)).isNotEqualTo(baseline);
        assertThat(TargetJdbcIdentity.class.getDeclaredMethods())
                .allSatisfy(method -> assertThat(method.getParameterTypes()).doesNotContain(char[].class));
    }
}
