/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.config;

/** Exact non-persistent activation input derived from one validated migration candidate. */
record MigrationActivationCandidate(String generation, String baseGeneration,
                                    ManagedApplicationConfig application, ManagedSecrets secrets) {

    static MigrationActivationCandidate from(MigrationCandidateMaterial material) {
        MigrationCandidateManifest manifest = material.manifest().orElseThrow();
        return new MigrationActivationCandidate(manifest.candidateGeneration(), manifest.baseGeneration(),
                material.application().orElseThrow(), material.secrets().orElseThrow());
    }

    @Override
    public String toString() {
        return "MigrationActivationCandidate[generation=" + generation
                + ", baseGeneration=" + baseGeneration + ", configuration=<redacted>]";
    }
}
