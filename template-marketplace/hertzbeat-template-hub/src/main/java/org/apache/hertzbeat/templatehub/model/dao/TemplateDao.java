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

import org.apache.hertzbeat.templatehub.model.DO.TemplateDO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface TemplateDao extends JpaRepository<TemplateDO, Integer> {

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
    List<TemplateDO> queryByUserId(int user, int isDel);

    @Query(value = "select * from template where `user` = ? and `is_del` = ?", nativeQuery = true)
    Page<TemplateDO> queryPageByUserId(int user, int isDel, Pageable pageable);

    @Deprecated
    @Query(value = "select * from template where `category_id` = ? and `is_del` = ?",nativeQuery=true)
    List<TemplateDO> queryByCategory(int categoryId, int isDel);

    @Query(value = "select * from template where `category_id` IN ? and `is_del` = ?",nativeQuery=true)
    Page<TemplateDO> queryPageByCategory(List<Integer> categoryIdList, int isDel, Pageable pageable);

    @Query(value = "select * from template where name like CONCAT('%',?,'%') AND `category_id` IN ? AND `is_del` = ?",nativeQuery=true)
    Page<TemplateDO> queryPageByNameLikeAndCategory(String nameLike, List<Integer> categoryIdList, int isDel, Pageable pageable);

    @Deprecated
    @Query(value = "select * from  template where is_del=? AND name like CONCAT('%',?,'%') ",nativeQuery = true)
    List<TemplateDO> queryByNameLike(int isDel, String name);

    @Query(value = "select * from  template where is_del=? AND name like CONCAT('%',?,'%') ",nativeQuery = true)
    Page<TemplateDO> queryPageByNameLike(int isDel, String name, Pageable pageable);

    @Query(value = "select * from template where `is_del` = ?",nativeQuery=true)
    List<TemplateDO> queryAllByIsDel(int isDel);

    @Query(value = "select * from template where `is_del` = ?",nativeQuery=true)
    Page<TemplateDO> queryPageByIsDel(int isDel, Pageable pageable);

    @Deprecated
    @Query(value = "select * from template where is_del = ? order by create_time desc ",nativeQuery = true)
    List<TemplateDO> queryAllByIsDelOrderByCreateTimeDesc(int isDel);

    @Query(value = "select * from template where is_del = ? order by create_time desc ",nativeQuery = true)
    Page<TemplateDO> queryPageByIsDelOrderByCreateTimeDesc(int isDel, Pageable pageable);

    @Deprecated
    @Query(value = "select * from template where is_del = ? order by create_time",nativeQuery = true)
    List<TemplateDO> queryAllByIsDelOrderByCreateTimeAsc(int isDel);

    @Query(value = "select * from template where is_del = ? order by create_time",nativeQuery = true)
    Page<TemplateDO> queryPageByIsDelOrderByCreateTimeAsc(int isDel, Pageable pageable);

    @Deprecated
    @Query(value = "select * from template where is_del = ? order by update_time desc ",nativeQuery = true)
    List<TemplateDO> getByIsDelOrderByUpdateTimeDesc(int isDel);

    @Query(value = "select * from template where is_del = ? order by update_time desc ",nativeQuery = true)
    Page<TemplateDO> queryPageByIsDelOrderByUpdateTimeDesc(int isDel, Pageable pageable);

    @Deprecated
    @Query(value = "select * from template where is_del = ? order by update_time",nativeQuery = true)
    List<TemplateDO> getByIsDelOrderByUpdateTimeAsc(int isDel);

    @Query(value = "select * from template where is_del = ? order by update_time",nativeQuery = true)
    Page<TemplateDO> queryPageByIsDelOrderByUpdateTimeAsc(int isDel, Pageable pageable);

    @Deprecated
    @Query(value = "select * from template where is_del = ? order by star desc ",nativeQuery = true)
    List<TemplateDO> getByIsDelOrderByStarDesc(int isDel);

    @Query(value = "select * from template where is_del = ? order by star desc ",nativeQuery = true)
    Page<TemplateDO> queryPageByIsDelOrderByStarDesc(int isDel, Pageable pageable);

    @Deprecated
    @Query(value = "select * from template where is_del = ? order by star",nativeQuery = true)
    List<TemplateDO> getByIsDelOrderByStarAsc(int isDel);

    @Query(value = "select * from template where is_del = ? order by star",nativeQuery = true)
    Page<TemplateDO> queryPageByIsDelOrderByStarAsc(int isDel, Pageable pageable);

    @Deprecated
    @Query(value = "select * from template where is_del = ? order by download desc ",nativeQuery = true)
    List<TemplateDO> getByIsDelOrderByDownloadDesc(int isDel);

    @Query(value = "select * from template where is_del = ? order by download desc ",nativeQuery = true)
    Page<TemplateDO> queryPageByIsDelOrderByDownloadDesc(int isDel, Pageable pageable);

    @Deprecated
    @Query(value = "select * from template where is_del = ? order by download",nativeQuery = true)
    List<TemplateDO> getByIsDelOrderByDownloadAsc(int isDel);

    @Query(value = "select * from template where is_del = ? order by download",nativeQuery = true)
    Page<TemplateDO> queryPageByIsDelOrderByDownloadAsc(int isDel, Pageable pageable);

    @Transactional
    @Modifying(clearAutomatically = true)
    @Query(value = "UPDATE template set `download` = `download` + ? where `id` = ?",nativeQuery=true)
    int downloadUpdate(int num, int id);

    TemplateDO findTemplateById(int id);

    @Transactional
    @Modifying(clearAutomatically = true)
    @Query(value = "UPDATE template set star = star - ? where `id` = ? AND is_del=0 AND off_shelf=0",nativeQuery=true)
    int cancelStarTemplate(int num, int templateId);

    @Transactional
    @Query(value = "select template.* from template left join star on template.id = star.template_id where star.user_id = ? AND star.is_del=? AND template.is_del=? AND template.off_shelf=?", nativeQuery = true)
    Page<TemplateDO> queryPageByUserStar(int userId, int isCancel, int isDel, int offShelf, Pageable pageable);
}
