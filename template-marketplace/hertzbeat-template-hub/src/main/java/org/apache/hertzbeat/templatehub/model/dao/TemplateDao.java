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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface TemplateDao extends JpaRepository<Template, Integer> {

    @Query(value = "select id from template where name= ? and `user`= ?",nativeQuery=true)
    int queryId(String name, int user);

    @Modifying(clearAutomatically = true)
    @Query(value = "UPDATE template set `latest` = ? where `id` = ?",nativeQuery=true)
    int updateTemplate(int latest,int id);

    @Query(value = "select COUNT(*) from template where `name` = ? and `user` = ?",nativeQuery=true)
    int queryCountByNameAndUser(String name,int user);

    @Query(value = "select COUNT(template.id) from template where `is_del` = ? and off_shelf = ? ",nativeQuery=true)
    int queryCountByIsDelAndOffShelf(int isDel, int offShelf);

    @Deprecated
    @Query(value = "select * from template where `user` = ? and `is_del` = ?",nativeQuery=true)
    List<Template> queryByUserId(int user, int isDel);

    @Query(value = "select * from template where `user` = ? and `is_del` = ?", nativeQuery = true)
    Page<Template> queryPageByUserId(int user, int isDel, Pageable pageable);

    @Deprecated
    @Query(value = "select * from template where `category` = ? and `is_del` = ?",nativeQuery=true)
    List<Template> queryByCategory(int categoryId, int isDel);

    @Query(value = "select * from template where `category` IN ? and `is_del` = ?",nativeQuery=true)
    Page<Template> queryPageByCategory(List<Integer> categoryIdList, int isDel, Pageable pageable);

    @Query(value = "select * from template where name like CONCAT('%',?,'%') AND `category` IN ? AND `is_del` = ?",nativeQuery=true)
    Page<Template> queryPageByNameLikeAndCategory(String nameLike, List<Integer> categoryIdList, int isDel, Pageable pageable);

    @Deprecated
    @Query(value = "select * from  template where is_del=? AND name like CONCAT('%',?,'%') ",nativeQuery = true)
    List<Template> queryByNameLike(int isDel, String name);

    @Query(value = "select * from  template where is_del=? AND name like CONCAT('%',?,'%') ",nativeQuery = true)
    Page<Template> queryPageByNameLike(int isDel, String name, Pageable pageable);

    @Deprecated
    @Query(value = "select * from template where `is_del` = ?",nativeQuery=true)
    List<Template> queryAllByIsDel(int isDel);

    @Query(value = "select * from template where `is_del` = ?",nativeQuery=true)
    Page<Template> queryPageByIsDel(int isDel, Pageable pageable);

    @Deprecated
    @Query(value = "select * from template where is_del = ? order by create_time desc ",nativeQuery = true)
    List<Template> queryAllByIsDelOrderByCreateTimeDesc(int isDel);

    @Query(value = "select * from template where is_del = ? order by create_time desc ",nativeQuery = true)
    Page<Template> queryPageByIsDelOrderByCreateTimeDesc(int isDel, Pageable pageable);

    @Deprecated
    @Query(value = "select * from template where is_del = ? order by create_time",nativeQuery = true)
    List<Template> queryAllByIsDelOrderByCreateTimeAsc(int isDel);

    @Query(value = "select * from template where is_del = ? order by create_time",nativeQuery = true)
    Page<Template> queryPageByIsDelOrderByCreateTimeAsc(int isDel, Pageable pageable);

    @Deprecated
    @Query(value = "select * from template where is_del = ? order by update_time desc ",nativeQuery = true)
    List<Template> getByIsDelOrderByUpdateTimeDesc(int isDel);

    @Query(value = "select * from template where is_del = ? order by update_time desc ",nativeQuery = true)
    Page<Template> queryPageByIsDelOrderByUpdateTimeDesc(int isDel, Pageable pageable);

    @Deprecated
    @Query(value = "select * from template where is_del = ? order by update_time",nativeQuery = true)
    List<Template> getByIsDelOrderByUpdateTimeAsc(int isDel);

    @Query(value = "select * from template where is_del = ? order by update_time",nativeQuery = true)
    Page<Template> queryPageByIsDelOrderByUpdateTimeAsc(int isDel, Pageable pageable);

    @Deprecated
    @Query(value = "select * from template where is_del = ? order by star desc ",nativeQuery = true)
    List<Template> getByIsDelOrderByStarDesc(int isDel);

    @Query(value = "select * from template where is_del = ? order by star desc ",nativeQuery = true)
    Page<Template> queryPageByIsDelOrderByStarDesc(int isDel, Pageable pageable);

    @Deprecated
    @Query(value = "select * from template where is_del = ? order by star",nativeQuery = true)
    List<Template> getByIsDelOrderByStarAsc(int isDel);

    @Query(value = "select * from template where is_del = ? order by star",nativeQuery = true)
    Page<Template> queryPageByIsDelOrderByStarAsc(int isDel, Pageable pageable);

    @Deprecated
    @Query(value = "select * from template where is_del = ? order by download desc ",nativeQuery = true)
    List<Template> getByIsDelOrderByDownloadDesc(int isDel);

    @Query(value = "select * from template where is_del = ? order by download desc ",nativeQuery = true)
    Page<Template> queryPageByIsDelOrderByDownloadDesc(int isDel, Pageable pageable);

    @Deprecated
    @Query(value = "select * from template where is_del = ? order by download",nativeQuery = true)
    List<Template> getByIsDelOrderByDownloadAsc(int isDel);

    @Query(value = "select * from template where is_del = ? order by download",nativeQuery = true)
    Page<Template> queryPageByIsDelOrderByDownloadAsc(int isDel, Pageable pageable);

    @Transactional
    @Modifying(clearAutomatically = true)
    @Query(value = "UPDATE template set `download` = `download` + ? where `id` = ?",nativeQuery=true)
    int downloadUpdate(int num, int id);

    Template findTemplateById(int id);

    @Transactional
    @Modifying(clearAutomatically = true)
    @Query(value = "UPDATE template set star = star - ? where `id` = ? AND is_del=0 AND off_shelf=0",nativeQuery=true)
    int cancelStarTemplate(int num, int templateId);


}
