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

import org.apache.hertzbeat.templatehub.model.entity.Template;
import org.apache.hertzbeat.templatehub.model.entity.Version;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.transaction.annotation.Transactional;

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

    @Deprecated
    @Query(value = "select * from version where `template` = ? and `is_del` = 0", nativeQuery = true)
    List<Version> queryVersionByTemplateId(int templateId);

    @Query(value = "select * from version where `template` = ? and `is_del` = ?", nativeQuery = true)
    Page<Version> queryPageByTemplateId(int templateId, int isDel, Pageable pageable);

    @Transactional
    @Modifying(clearAutomatically = true)
    @Query(value = "UPDATE version set `download` = `download` + ? where `id` = ?",nativeQuery=true)
    int downloadUpdate(int num, int id);

    @Deprecated
    @Transactional
    @Query(value = "select version.* from version left join star on version.id = star.version_id where star.user_id = ? AND star.is_del=? AND version.is_del=? AND version.off_shelf=?", nativeQuery = true)
    List<Version> findAllByUserStar(int userId, int isCancel, int isDel, int offShelf);

    @Transactional
    @Query(value = "select version.* from version left join star on version.id = star.version_id where star.user_id = ? AND star.is_del=? AND version.is_del=? AND version.off_shelf=?", nativeQuery = true)
    Page<Version> queryPageByUserStar(int userId, int isCancel, int isDel, int offShelf, Pageable pageable);

    @Transactional
    @Modifying(clearAutomatically = true)
    @Query(value = "UPDATE version set star = version.star - ? where `id` = ? AND is_del=0 AND off_shelf=0",nativeQuery=true)
    int cancelStarVersion(int num, int versionId);

    @Transactional
    @Query(value = "select version.* from version join template on version.id = template.latest where template.id = ?", nativeQuery = true)
    Version queryLatestByTemplate(int templateId);
}
