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

package org.apache.hertzbeat.manager.service;

import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.bulletin.Bulletin;
import org.apache.hertzbeat.common.entity.manager.bulletin.BulletinDto;
import org.apache.hertzbeat.common.entity.manager.bulletin.BulletinMetricsData;
import org.apache.hertzbeat.common.entity.manager.bulletin.BulletinVo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

/**
 * Bulletin Service
 */
public interface BulletinService {

    /**
     * validate Bulletin
     */
    void validate(BulletinDto bulletindto) throws IllegalArgumentException;

    /**
     * Get Bulletin by name
     */
    Bulletin getBulletinByName(String name);

    /**
     * Get Bulletin by id
     */
    Optional<Bulletin> getBulletinById(Long id);

    /**
     * Get all names
     */
    List<String> getAllNames();


    /**
     * delete Bulletin by id
     */
    void deleteBulletinByName(List<String> names);


    /**
     * Save Bulletin
     */
    void editBulletin(BulletinDto bulletinDto);

    /**
     * Add Bulletin
     */
    void addBulletin(BulletinDto bulletinDto);

    /**
     * Dynamic conditional query
     * @param specification Query conditions
     * @param pageRequest Paging parameters
     * @return The query results
     */
    Page<BulletinVo> getBulletins(Specification<Bulletin> specification, PageRequest pageRequest);

    /**
     * deal with the bulletin
     */
    BulletinMetricsData buildBulletinMetricsData(BulletinMetricsData.BulletinMetricsDataBuilder contentBuilder, Bulletin bulletin);
}
