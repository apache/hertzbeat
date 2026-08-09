/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class EmbeddedH2SourceClassifierTest {

    @Test
    void acceptsOnlyExplicitEmbeddedMemoryAndLocalFileUrls() {
        assertThat(EmbeddedH2SourceClassifier.isSafeEmbeddedSource("H2", "jdbc:h2:mem:manager")).isTrue();
        assertThat(EmbeddedH2SourceClassifier.isSafeEmbeddedSource("H2", "jdbc:h2:file:/var/lib/manager")).isTrue();
        assertThat(EmbeddedH2SourceClassifier.isSafeEmbeddedSource("H2", "jdbc:h2:./data/manager")).isTrue();
        assertThat(EmbeddedH2SourceClassifier.isSafeEmbeddedSource("H2", "jdbc:h2:.\\data\\manager")).isTrue();
        assertThat(EmbeddedH2SourceClassifier.isSafeEmbeddedSource("H2", "jdbc:h2:..\\data\\manager")).isTrue();
        assertThat(EmbeddedH2SourceClassifier.isSafeEmbeddedSource("H2", "jdbc:h2:C:\\data\\manager")).isTrue();
        assertThat(EmbeddedH2SourceClassifier.isSafeEmbeddedSource("H2", "jdbc:h2:tcp://db/manager")).isFalse();
        assertThat(EmbeddedH2SourceClassifier.isSafeEmbeddedSource("H2", "jdbc:h2:ssl://db/manager")).isFalse();
        assertThat(EmbeddedH2SourceClassifier.isSafeEmbeddedSource("H2", "jdbc:h2:file:tcp://db/manager")).isFalse();
        assertThat(EmbeddedH2SourceClassifier.isSafeEmbeddedSource("H2", "jdbc:h2:file:////db/manager")).isFalse();
        assertThat(EmbeddedH2SourceClassifier.isSafeEmbeddedSource("H2", "jdbc:h2:\\\\db\\manager")).isFalse();
        assertThat(EmbeddedH2SourceClassifier.isSafeEmbeddedSource(
                "H2", "jdbc:h2:file:/var/lib/manager;AUTO_SERVER=TRUE")).isFalse();
        assertThat(EmbeddedH2SourceClassifier.isSafeEmbeddedSource(
                "H2", "jdbc:h2:file:/var/lib/manager;FILE_LOCK=NO")).isFalse();
        assertThat(EmbeddedH2SourceClassifier.isSafeEmbeddedSource("PostgreSQL", "jdbc:h2:mem:manager")).isFalse();
        assertThat(EmbeddedH2SourceClassifier.isSafeEmbeddedSource("H2", "jdbc:unknown:manager")).isFalse();
    }

    @Test
    void matchesConfiguredSourceToActualMetadataLocation() {
        assertThat(EmbeddedH2SourceClassifier.matchesConfiguredSource(
                "jdbc:h2:mem:manager;MODE=MYSQL", "jdbc:h2:mem:manager")).isTrue();
        assertThat(EmbeddedH2SourceClassifier.matchesConfiguredSource(
                "jdbc:h2:./data/manager;MODE=MYSQL", "jdbc:h2:file:./data/manager")).isTrue();
        assertThat(EmbeddedH2SourceClassifier.matchesConfiguredSource(
                "jdbc:h2:mem:manager", "jdbc:h2:mem:other")).isFalse();
        assertThat(EmbeddedH2SourceClassifier.matchesConfiguredSource(
                "jdbc:h2:file:/safe/manager", "jdbc:h2:file:/other/manager")).isFalse();
    }
}
