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

package org.apache.hertzbeat.templatehub.model.DAO;

import org.apache.hertzbeat.templatehub.model.DO.AuthResourceDO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * @author tomsun28
 * @date 16:40 2019-07-27
 */
public interface AuthResourceDao extends JpaRepository<AuthResourceDO, Long> {

    /**
     * Get uri resource and resource-role relationship chain, eg: /api/v2/host===post===[role2,role3,role4]
     * @return resource-role chain set
     */
    @Query(value = "SELECT  CONCAT(LOWER(res.uri),\"===\",LOWER(res.method),\"===[\",IFNULL(GROUP_CONCAT(DISTINCT role.code),\"\"),\"]\") " +
            "FROM auth_resource res " +
            "LEFT JOIN auth_role_resource_bind bind on res.id = bind.resource_id " +
            "LEFT JOIN auth_role role on role.id = bind.role_id " +
            "where res.status = 1 " +
            "group by res.id", nativeQuery = true)
    Optional<List<String>> getEnableResourcePathRoleData();



    /**
     * Get disabled uri resources eg: /api/v2/host===post
     * @return resouce set
     */
    @Query("select CONCAT(LOWER(resource.uri),'===', resource.method) " +
            "from AuthResourceDO resource where resource.status = 9 order by resource.id")
    Optional<List<String>> getDisableResourcePathData();

    /**
     * Get the available API resources owned by the current role in the form of paging
     * @param roleId roleId
     * @param request page
     * @return api resource list
     */
    @Query("select distinct resource from AuthResourceDO resource " +
            "left join AuthRoleResourceBindDO bind on bind.resourceId = resource.id " +
            "where bind.roleId = :roleId " +
            "order by resource.id asc")
    Page<AuthResourceDO> findRoleOwnResource(@Param("roleId") Long roleId, Pageable request);

    /**
     * Get the available API resources owned by the current role in the form of paging
     * @param roleId roleId
     * @param request page
     * @return api resource list
     */
    @Query("select distinct resource from AuthResourceDO resource " +
            " where resource.id not in " +
            "(select distinct bind.resourceId from AuthRoleResourceBindDO bind where bind.roleId = :roleId) " +
            "order by resource.id asc ")
    Page<AuthResourceDO> findRoleNotOwnResource(@Param("roleId") Long roleId, Pageable request);
}
