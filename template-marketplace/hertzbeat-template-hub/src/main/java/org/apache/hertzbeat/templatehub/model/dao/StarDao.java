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

import org.apache.hertzbeat.templatehub.model.DO.StarDO;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface StarDao extends JpaRepository<StarDO, Integer> , Repository<StarDO, Integer> {

    @Modifying(clearAutomatically = true)
    @Transactional
    @Query(value = "UPDATE star set `is_del` = ? where `user_id` = ? AND template_id=? AND is_del=?", nativeQuery = true)
    int cancelByUser(int cancel, int userId,int templateId,int isCancel);

    @Query(value = "select star.template_id from star where `user_id` = ? AND is_del=?", nativeQuery = true)
    List<Integer> queryTemplateIdByUserAndIsDel(int userId, int isDel);

//    @Query(value = "select star.id from star where `user_id` = ? AND is_del=?", nativeQuery = true)
    boolean existsStarByTemplateIdAndUserIdAndIsDel(int templateId ,int userId, int isDel);

}
