/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.alert.service;

import java.util.List;
import java.util.Set;
import org.apache.hertzbeat.alert.dto.AlertSilenceDeleteResponse;
import org.apache.hertzbeat.alert.dto.AlertSilencePageResponse;
import org.apache.hertzbeat.alert.dto.AlertSilenceRequest;
import org.apache.hertzbeat.alert.dto.AlertSilenceResponse;

/** Safe CRUD boundary for alert silences. */
public interface AlertSilenceService {

    AlertSilenceResponse create(AlertSilenceRequest request);

    AlertSilenceResponse update(AlertSilenceRequest request);

    AlertSilenceResponse get(long silenceId);

    AlertSilenceDeleteResponse delete(Set<Long> silenceIds);

    AlertSilencePageResponse list(List<Long> silenceIds, String search, String sort, String order,
                                  int pageIndex, int pageSize);
}
