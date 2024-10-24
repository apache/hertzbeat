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
import org.apache.hertzbeat.templatehub.model.DO.AuthRoleResourceBindDO;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * @author tomsun28
 * @date 16:43 2019-07-27
 */
public interface AuthRoleResourceBindDao extends JpaRepository<AuthRoleResourceBindDO, Long> {

    /**
     * Query the resources owned by the current role
     * @param roleId roleId
     * @return resource list
     */
    @Query("select rs from AuthResourceDO rs, AuthRoleResourceBindDO bind " +
            "where rs.id = bind.resourceId and bind.roleId = :roleId")
    List<AuthResourceDO> findRoleBindResourceList(@Param("roleId") Long roleId);

    /**
     * delete record which roleId and resource equals this
     * @param roleId roleID
     * @param resourceId resourceId
     */
    @Modifying
    @Query("delete from AuthRoleResourceBindDO bind " +
            "where bind.roleId = :roleId and bind.resourceId = :resourceId")
    void deleteRoleResourceBind(@Param("roleId") Long roleId,@Param("resourceId") Long resourceId);
}
