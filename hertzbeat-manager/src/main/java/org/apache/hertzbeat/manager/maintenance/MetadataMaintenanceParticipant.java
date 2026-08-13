/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

import java.time.Duration;

/** One metadata producer that can stop admitting work and drain already admitted work. */
public interface MetadataMaintenanceParticipant {

    String participantId();

    /** Stop admitting work and drain work admitted before this call. */
    void quiesce(Duration timeout);

    /** Resume normal admission without creating another scheduler or consumer. */
    void resume();
}
