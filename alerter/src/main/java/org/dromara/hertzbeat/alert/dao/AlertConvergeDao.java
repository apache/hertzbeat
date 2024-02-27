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

package org.dromara.hertzbeat.alert.dao;

import org.dromara.hertzbeat.common.entity.alerter.AlertConverge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;

import java.util.Set;

/**
 * AlertConverge Dao
 * @author tom
 */
public interface AlertConvergeDao extends JpaRepository<AlertConverge, Long>, JpaSpecificationExecutor<AlertConverge> {
	
	/**
	 * Delete alarm converge based on the ID list
	 * @param convergeIds alert converge id list
	 */
	@Modifying
	void deleteAlertConvergesByIdIn(Set<Long> convergeIds);
}
