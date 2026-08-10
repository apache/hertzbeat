/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.io.IOException;
import java.io.OutputStream;
import org.apache.hertzbeat.manager.setup.config.SecretValue;

/** Pure bound renderer with no owned resources; the borrowed secret must not be retained. */
@FunctionalInterface
public interface MigrationExportRenderer {

    void write(SecretValue borrowedSecret, OutputStream output) throws IOException;
}
