/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.warehouse.store.metadata;

/** Typed metadata write port for monitor availability convergence. */
public interface MonitorStatusMetadataWriter {

    /** Converge a non-paused monitor to the supplied availability. */
    void updateAvailability(long monitorId, MonitorAvailability availability);
}
