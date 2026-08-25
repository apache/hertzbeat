/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.monitor.definition;

import java.util.List;

/** Signals that a target contains same-name definitions with different content. */
public class MonitorDefinitionMigrationConflictException extends IllegalStateException {

    public static final String ERROR_CODE = "object_store_migration_conflict";

    private final List<String> apps;

    public MonitorDefinitionMigrationConflictException(List<String> apps) {
        super("monitor definition migration conflict");
        this.apps = List.copyOf(apps);
    }

    public List<String> apps() {
        return apps;
    }
}
