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

import org.apache.hertzbeat.templatehub.model.DO.AuthRoleDO;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * @author tomsun28
 * @date 16:42 2019-07-27
 */
public interface AuthRoleDao extends JpaRepository<AuthRoleDO, Long> {

    /**
     * Query the role owned by the current user
     * @param username username
     * @return role list
     */
    @Query("select ar.name from AuthRoleDO ar, AuthUserDO au, AuthUserRoleBindDO bind " +
            "where ar.id = bind.roleId and au.id = bind.userId and au.name = :username")
    List<String> findAccountOwnRoles(@Param("username") String username);

    @Query("select ar.id from AuthRoleDO ar where ar.code = :code")
    Long queryIdByCode(@Param("code") String code);
}
