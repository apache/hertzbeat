/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.common.entity.dto.observability;

import java.util.List;

/**
 * Stable pagination payload shared by the three signal workbenches.
 *
 * @param content current page content
 * @param pageIndex zero-based page index
 * @param pageSize requested page size
 * @param totalElements total matching records
 * @param <T> row type
 */
public record SignalPage<T>(List<T> content, int pageIndex, int pageSize, long totalElements) {
}
