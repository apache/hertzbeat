/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.monitor.definition;

import java.util.Map;

/** Storage boundary shared by the active runtime and safe migrations. */
public interface MonitorDefinitionStore extends AutoCloseable {

    Map<String, String> loadAll();

    String load(String app);

    void save(String app, String definition);

    void delete(String app);

    @Override
    default void close() {
    }
}
