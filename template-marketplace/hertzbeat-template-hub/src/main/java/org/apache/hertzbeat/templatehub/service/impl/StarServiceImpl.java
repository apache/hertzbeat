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
import org.apache.hertzbeat.templatehub.model.DAO.StarDao;
import org.apache.hertzbeat.templatehub.model.DAO.TemplateDao;
import org.apache.hertzbeat.templatehub.model.DAO.VersionDao;
import org.apache.hertzbeat.templatehub.model.DO.StarDO;
import org.apache.hertzbeat.templatehub.model.DO.TemplateDO;
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
    @Autowired
    private TemplateDao templateDao;

    @Override
    public int starTemplate(int userId, int templateId, String nowTime) {

        StarDO starDO = new StarDO();
        starDO.setId(0);
        starDO.setUserId(userId);
        starDO.setTemplateId(templateId);
        starDO.setCreateTime(nowTime);
        starDO.setIsDel(0);

        StarDO save = starDao.save(starDO);
        if(save.getId()==0) {
            return 0;
        }

        return 1;
    }

    @Override
    public boolean assertTemplateIdIsStarByUser(int userId, int templateId) {
        return starDao.existsStarByTemplateIdAndUserIdAndIsDel(templateId,userId,0);
    }

    @Override
    public List<Integer> getTemplateByUserStar(int userId, int isDel) {
        return starDao.queryTemplateIdByUserAndIsDel(userId, isDel);
    }

    @Override
    public Page<TemplateDO> getPageByUserStar(int userId, int isCancel, int isDel, int offShelf, int page, int size) {
        Pageable pageable= PageRequest.of(page, size);
        return templateDao.queryPageByUserStar(userId, isCancel, isDel, offShelf,pageable);
    }

    @Override
    public Boolean cancelStarByUser(int userId, int templateId) {
        int i = starDao.cancelByUser(1, userId, templateId, 0);
        return i != 0;
    }
}
