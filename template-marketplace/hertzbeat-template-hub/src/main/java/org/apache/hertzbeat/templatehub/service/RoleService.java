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

package org.apache.hertzbeat.templatehub.service;

import org.apache.hertzbeat.templatehub.model.DO.AuthResourceDO;
import org.apache.hertzbeat.templatehub.model.DO.AuthRoleDO;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;

public interface RoleService {

    Long getRoleIdByCode(String code);

    /**
     * Determine whether the role already exists
     * @param authRole role
     * @return existed-true no-false
     */
    boolean isRoleExist(AuthRoleDO authRole);

    /**
     * add role
     * @param authRole role
     * @return add success-true failed-false
     */
    boolean addRole(AuthRoleDO authRole);

    /**
     * update role
     * @param authRole role
     * @return success-true failed-false
     */
    boolean updateRole(AuthRoleDO authRole);

    /**
     * delete role
     * @param roleId role ID
     * @return success-true failed-false
     */
    boolean deleteRole(Long roleId);

    /**
     * get all role list
     * @return role list
     */
    Optional<List<AuthRoleDO>> getAllRole();

    /**
     * get roles page
     * @param currentPage current page
     * @param pageSize page size
     * @return Page of roles
     */
    Page<AuthRoleDO> getPageRole(Integer currentPage, Integer pageSize);

    /**
     * get pageable resources which this role owned
     * @param roleId role ID
     * @param currentPage current page
     * @param pageSize page size
     * @return Page of resources
     */
    Page<AuthResourceDO> getPageResourceOwnRole(Long roleId, Integer currentPage, Integer pageSize);

    /**
     * get pageable resources which this role not owned
     * @param roleId role ID
     * @param currentPage current page
     * @param pageSize page size
     * @return Page of resources
     */
    Page<AuthResourceDO> getPageResourceNotOwnRole(Long roleId, Integer currentPage, Integer pageSize);

    /**
     * authority this resource to this role
     * @param roleId role ID
     * @param resourceId resource ID
     */
    void authorityRoleResource(Long roleId, Long resourceId);

    /**
     * unAuthority this resource in this role
     * @param roleId role ID
     * @param resourceId resource ID
     */
    void deleteAuthorityRoleResource(Long roleId, Long resourceId);

}
