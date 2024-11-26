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
import org.apache.hertzbeat.common.entity.manager.Bulletin;
import org.apache.hertzbeat.manager.pojo.dto.BulletinMetricsData;
import org.springframework.data.domain.Page;

/**
 * Bulletin Service
 */
public interface BulletinService {

    /**
     * validate Bulletin
     */
    void validate(Bulletin bulletin) throws IllegalArgumentException;
    
    /**
     * Get Bulletin by id
     */
    Optional<Bulletin> getBulletinById(Long id);

    /**
     * Save Bulletin
     */
    void editBulletin(Bulletin bulletin);

    /**
     * Add Bulletin
     */
    void addBulletin(Bulletin bulletin);
    
    /**
     * deal with the bulletin
     */
    BulletinMetricsData buildBulletinMetricsData(Long id);

    /**
     * query bulletins
     * @param search search name
     * @param pageIndex page index
     * @param pageSize page size
     * @return bulletins
     */
    Page<Bulletin> getBulletins(String search, Integer pageIndex, Integer pageSize);

    /**
     * delete bulletins
     * @param ids bulletin ids
     */
    void deleteBulletins(List<Long> ids);
}
