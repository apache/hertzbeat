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
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * @author tomsun28
 * @date 00:13 2019-08-01
 */
public interface ResourceService {

    /**
     * add uri resource
     * @param authResource resource
     * @return success-true failed-false
     */
    boolean addResource(AuthResourceDO authResource);

    /**
     * Determine whether the resource already exists
     * @param authResource resource
     * @return existed-true no-false
     */
    boolean isResourceExist(AuthResourceDO authResource);

    /**
     * update uri resource
     * @param authResource resource
     * @return success-true failed-false
     */
    boolean updateResource(AuthResourceDO authResource);

    /**
     * delete uri resource
     * @param resourceId resource ID
     * @return success-true no existed-false
     */
    boolean deleteResource(Long resourceId);

    /**
     * get all resources
     * @return resource list
     */
    Optional<List<AuthResourceDO>> getAllResource();

    /**
     * get resource by page
     * @param currentPage current page
     * @param pageSize page size
     * @return Page of resource
     */
    Page<AuthResourceDO> getPageResource(Integer currentPage, Integer pageSize);

    /**
     * get enabled resource-path-role eg: /api/v2/host===post===[role2,role3,role4]
     * @return resource-path-role
     */
    Set<String> getAllEnableResourcePath();

    /**
     * get disable resource-path-role eg: /api/v2/host===post===[role2,role3,role4]
     * @return resource-path-role
     */
    Set<String> getAllDisableResourcePath();
}
