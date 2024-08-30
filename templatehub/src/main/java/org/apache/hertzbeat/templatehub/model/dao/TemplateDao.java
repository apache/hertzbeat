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

package org.apache.hertzbeat.templatehub.model.dao;

import org.apache.hertzbeat.templatehub.model.entity.Template;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface TemplateDao extends JpaRepository<Template, Integer> {

    @Query(value = "select id from template where name= ? and `user`= ?",nativeQuery=true)
    int queryId(String name, int user);

    @Modifying(clearAutomatically = true)
    @Query(value = "UPDATE template set `latest` = ? where `id` = ?",nativeQuery=true)
    int updateTemplate(int latest,int id);

    @Query(value = "select COUNT(*) from template where `name` = ? and `user` = ?",nativeQuery=true)
    int queryCountByNameAndUser(String name,int user);

    @Query(value = "select * from template where `user` = ? and `is_del` = ?",nativeQuery=true)
    List<Template> queryByUserId(int user, int isDel);

    @Query(value = "select * from template where `is_del` = ?",nativeQuery=true)
    List<Template> queryAllByIsDel(int isDel);

    Template findTemplateById(int id);
}
