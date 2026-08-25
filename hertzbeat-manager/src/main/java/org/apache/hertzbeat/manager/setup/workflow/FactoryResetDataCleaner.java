/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

package org.apache.hertzbeat.manager.setup.workflow;

/** Destructive data boundary used only after a durable factory-reset request. */
@FunctionalInterface
public interface FactoryResetDataCleaner {

    void clean();
}
