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

package org.apache.hertzbeat.templatehub.model.dao;

import org.apache.hertzbeat.templatehub.model.entity.Version;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import java.util.List;

public interface VersionDao extends JpaRepository<Version, Integer> , Repository<Version, Integer> {

    /**
     * Query the inserted version ID based on the template ID and version number
     * @return Returns the version id of the query
     */
    @Query(value = "select id from version where `template` = ? and `version` = ?", nativeQuery = true)
    int queryId(int templateId, String version);

    /**
     * Check whether there is the same version data according to the template id and version number, that is, query the number
     * @return Returns the number of versions queried
     */
    @Query(value = "SELECT COUNT(*) from version where `template` = ? and `version` = ?", nativeQuery = true)
    int queryCountByTemplateAndVersion(int templateId, String version);

    @Query(value = "select * from version where `template` = ? and `is_del` = 0", nativeQuery = true)
    List<Version> queryVersionByTemplateId(int templateId);

}
