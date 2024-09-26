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
import org.apache.hertzbeat.templatehub.model.dao.CategoryDao;
import org.apache.hertzbeat.templatehub.model.dao.TemplateDao;
import org.apache.hertzbeat.templatehub.model.entity.Category;
import org.apache.hertzbeat.templatehub.model.entity.Template;
import org.apache.hertzbeat.templatehub.service.CategoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Slf4j
@Service
public class CategoryServiceImpl implements CategoryService {

    @Autowired
    CategoryDao categoryDao;

    @Autowired
    TemplateDao templateDao;

    @Override
    public boolean addCategory(String categoryName, String categoryDescription, String nowTime) {

        Category save = categoryDao.save(new Category(0, categoryName, categoryDescription, nowTime, nowTime, 0));

        return save.getId() > 0;
    }

    @Override
    public boolean modifyCategory(int id, String categoryName, String categoryDescription, String nowTime) {

        Optional<Category> byId = categoryDao.findById(id);

        if(byId.isEmpty()){
            return false;
        }
        Category category = byId.get();
        category.setName(categoryName);
        category.setDescription(categoryDescription);
        category.setUpdateTime(nowTime);

        categoryDao.save(category);

        return true;
    }

    @Override
    public boolean deleteCategory(int id) {

        Page<Template> templates = templateDao.queryPageByCategory(id, 0, PageRequest.of(0,1));

        if(templates.getTotalElements()!=0){
            return false;
        }
        int i = categoryDao.deleteByIsDel(id);
        return i > 0;
    }

    @Override
    public List<Category> getAllCategoryByIsDel(int isDel) {
        return categoryDao.findAllByIsDel(isDel);
    }

    @Override
    public Page<Category> getPageByIsDel(int isDel, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);
        return categoryDao.findAllByIsDel(isDel,pageable);
    }
}
