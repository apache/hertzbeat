/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
