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

package org.apache.hertzbeat.manager.dao;

import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.SignalDashboardPanelDraftEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Signal dashboard panel draft repository.
 */
public interface SignalDashboardPanelDraftDao extends JpaRepository<SignalDashboardPanelDraftEntity, Long> {

    List<SignalDashboardPanelDraftEntity> findByCreatorAndSignalOrderByUpdateTimeDesc(String creator, String signal);

    Optional<SignalDashboardPanelDraftEntity> findByCreatorAndSignalAndDraftKey(String creator, String signal, String draftKey);

    @Modifying
    @Query("delete from SignalDashboardPanelDraftEntity draft "
            + "where draft.creator = :creator and draft.signal = :signal and draft.draftKey = :draftKey")
    void deleteByCreatorAndSignalAndDraftKey(@Param("creator") String creator, @Param("signal") String signal,
                                             @Param("draftKey") String draftKey);
}
