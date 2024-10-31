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
import org.apache.hertzbeat.templatehub.model.DO.AuthUserRoleBindDO;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * @author tomsun28
 * @date 16:44 2019-07-27
 */
public interface AuthUserRoleBindDao extends JpaRepository<AuthUserRoleBindDO, Long> {

    /**
     * Query the role owned by the current user
     * @param userId userId
     * @return role list
     */
    @Query("select ar from AuthRoleDO ar, AuthUserRoleBindDO bind " +
            "where ar.id = bind.roleId and bind.userId = :userId")
    List<AuthRoleDO> findUserBindRoleList(@Param("userId") Long userId);

    /**
     * delete record which roleId and userId equals this
     * @param roleId roleID
     * @param userId userId
     */
    @Query("delete from AuthUserRoleBindDO bind " +
            "where bind.roleId = :roleId and bind.userId = :userId")
    void deleteRoleResourceBind(@Param("roleId") Long roleId,@Param("userId") Long userId);
}
