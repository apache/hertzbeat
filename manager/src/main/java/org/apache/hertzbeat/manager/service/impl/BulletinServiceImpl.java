/*
 *
 *  * Licensed to the Apache Software Foundation (ASF) under one or more
 *  * contributor license agreements.  See the NOTICE file distributed with
 *  * this work for additional information regarding copyright ownership.
 *  * The ASF licenses this file to You under the Apache License, Version 2.0
 *  * (the "License"); you may not use this file except in compliance with
 *  * the License.  You may obtain a copy of the License at
 *  *
 *  *     http://www.apache.org/licenses/LICENSE-2.0
 *  *
 *  * Unless required by applicable law or agreed to in writing, software
 *  * distributed under the License is distributed on an "AS IS" BASIS,
 *  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  * See the License for the specific language governing permissions and
 *  * limitations under the License.
 *
 *
 */

package org.apache.hertzbeat.manager.service.impl;

import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.manager.dao.BulletinDao;
import org.apache.hertzbeat.common.entity.manager.bulletin.Bulletin;
import org.apache.hertzbeat.manager.service.BulletinService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

/**
 * Bulletin Service Implementation
 */

@Service
@Slf4j
public class BulletinServiceImpl implements BulletinService {

    @Autowired
    private BulletinDao bulletinDao;

    /**
     * validate Bulletin
     *
     * @param bulletin
     * @param isModify
     */
    @Override
    public void validate(Bulletin bulletin, Boolean isModify) throws IllegalArgumentException {
        if (bulletin == null) {
            throw new IllegalArgumentException("Bulletin cannot be null");
        }
        if (isModify && bulletin.getId() == null) {
            throw new IllegalArgumentException("Bulletin id cannot be null");
        }
    }

    /**
     * List Bulletin
     */
    @Override
    public List<Bulletin> listBulletin() {
        return bulletinDao.findAll();
    }

    /**
     * Save Bulletin
     */
    @Override
    public void saveBulletin(Bulletin bulletin) {
        bulletinDao.save(bulletin);
    }

    /**
     * Dynamic conditional query
     *
     * @param specification Query conditions
     * @param pageRequest   Paging parameters
     * @return The query results
     */
    @Override
    public Page<Bulletin> getBulletins(Specification<Bulletin> specification, PageRequest pageRequest) {
       return bulletinDao.findAll(specification, pageRequest);
    }
}
