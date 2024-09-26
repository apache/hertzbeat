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

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.templatehub.model.dao.StarDao;
import org.apache.hertzbeat.templatehub.model.dao.VersionDao;
import org.apache.hertzbeat.templatehub.model.entity.Star;
import org.apache.hertzbeat.templatehub.model.entity.Version;
import org.apache.hertzbeat.templatehub.service.StarService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
public class StarServiceImpl implements StarService {

    @Autowired
    StarDao starDao;

    @Autowired
    VersionDao versionDao;

    @Override
    public int starVersion(int userId, int templateId, int versionId, String nowTime) {

        Star star = new Star();
        star.setId(0);
        star.setUserId(userId);
        star.setTemplateId(templateId);
        star.setVersionId(versionId);
        star.setCreateTime(nowTime);
        star.setIsDel(0);

        Star save = starDao.save(star);
        if(save.getId()==0) {
            return 0;
        }

        return 1;
    }

    @Deprecated
    @Override
    public List<Version> getVersionByUserStar(int userId, int isCancel, int isDel, int offShelf) {
        return versionDao.findAllByUserStar(userId, isCancel, isDel, offShelf);
    }

    @Override
    public Page<Version> getPageByUserStar(int userId, int isCancel, int isDel, int offShelf, int page, int size) {
        Pageable pageable= PageRequest.of(page, size);
        return versionDao.queryPageByUserStar(userId, isCancel, isDel, offShelf,pageable);
    }

    @Override
    public Boolean cancelStarByUser(int userId, int versionId) {
        int i = starDao.cancelByUser(1, userId, versionId, 0);
        return i != 0;
    }
}
