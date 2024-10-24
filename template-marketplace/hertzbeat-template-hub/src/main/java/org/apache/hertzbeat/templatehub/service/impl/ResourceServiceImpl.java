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

package org.apache.hertzbeat.templatehub.service.impl;

import org.apache.hertzbeat.templatehub.model.DAO.AuthResourceDao;
import org.apache.hertzbeat.templatehub.model.DO.AuthResourceDO;
import org.apache.hertzbeat.templatehub.service.ResourceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * @author tomsun28
 * @date 13:09 2019-08-04
 */
@Service
@Transactional(rollbackFor = Exception.class)
public class ResourceServiceImpl implements ResourceService {

    @Autowired
    private AuthResourceDao authResourceDao;

    @Override
    public boolean addResource(AuthResourceDO authResource) {
        if (isResourceExist(authResource)) {
            return false;
        } else {
            authResourceDao.saveAndFlush(authResource);
            return true;
        }
    }

    @Override
    public boolean isResourceExist(AuthResourceDO authResource) {
        AuthResourceDO resource = AuthResourceDO.builder()
                .uri(authResource.getUri())
                .method(authResource.getMethod())
                .build();
        Example<AuthResourceDO> example = Example.of(resource);
        return authResourceDao.exists(example);
    }

    @Override
    public boolean updateResource(AuthResourceDO authResource) {
        if (authResourceDao.existsById(authResource.getId())) {
            authResourceDao.saveAndFlush(authResource);
            return true;
        } else {
            return false;
        }
    }

    @Override
    public boolean deleteResource(Long resourceId) {
        if (authResourceDao.existsById(resourceId)) {
            authResourceDao.deleteById(resourceId);
            return true;
        } else {
            return false;
        }
    }

    @Override
    public Optional<List<AuthResourceDO>> getAllResource() {
        List<AuthResourceDO> resourceList = authResourceDao.findAll();
        return Optional.of(resourceList);
    }

    @Override
    public Page<AuthResourceDO> getPageResource(Integer currentPage, Integer pageSize) {
        PageRequest pageRequest = PageRequest.of(currentPage, pageSize);
        return authResourceDao.findAll(pageRequest);
    }

    @Override
    public Set<String> getAllEnableResourcePath() {
        Optional<List<String>> optional = authResourceDao.getEnableResourcePathRoleData();
        return optional.<Set<String>>map(HashSet::new).orElseGet(() -> new HashSet<>(0));
    }

    @Override
    public Set<String> getAllDisableResourcePath() {
        Optional<List<String>> optional = authResourceDao.getDisableResourcePathData();
        return optional.<Set<String>>map(HashSet::new).orElseGet(() -> new HashSet<>(0));
    }
}
