/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.service.importtask;

/** Identifies deterministic import parsing or content-shape rejection. */
public final class InvalidImportContentException extends IllegalArgumentException {

    public static final String MESSAGE = "Monitor import content is invalid.";
    public static final String YAML_MESSAGE = "Monitor YAML import content is invalid.";

    public InvalidImportContentException() {
        super(MESSAGE);
    }

    private InvalidImportContentException(String message) {
        super(message);
    }

    public static InvalidImportContentException forYaml() {
        return new InvalidImportContentException(YAML_MESSAGE);
    }
}
