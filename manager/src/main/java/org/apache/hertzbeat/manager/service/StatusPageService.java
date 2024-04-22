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
import org.apache.hertzbeat.common.entity.manager.StatusPageComponent;
import org.apache.hertzbeat.common.entity.manager.StatusPageIncident;
import org.apache.hertzbeat.common.entity.manager.StatusPageOrg;
import org.apache.hertzbeat.manager.pojo.dto.ComponentStatus;

/**
 * status page service interface.
 */
public interface StatusPageService {

    /**
     * query status page organization.
     * @return status page organization
     */
    StatusPageOrg queryStatusPageOrg();

    /**
     * save status page organization.
     * @return status page organization
     */
    StatusPageOrg saveStatusPageOrg(StatusPageOrg statusPageOrg);
    
    /**
     * query status page components.
     * @return status page components
     */
    List<StatusPageComponent> queryStatusPageComponents();
    
    /**
     * save status page component.
     * @param statusPageComponent status page component
     */
    void newStatusPageComponent(StatusPageComponent statusPageComponent);
    
    /**
     * update status page component.
     * @param statusPageComponent status page component
     */
    void updateStatusPageComponent(StatusPageComponent statusPageComponent);

    /**
     * delete status page component.
     * @param id status page component id
     */
    void deleteStatusPageComponent(long id);

    /**
     * query status page component.
     * @param id status page component id
     * @return status page component
     */
    StatusPageComponent queryStatusPageComponent(long id);

    /**
     * query status page components status.
     * @return status page components status
     */
    List<ComponentStatus> queryComponentsStatus();

    /**
     * query status page component status.
     * @param id status page component id
     * @return status page component status
     */
    ComponentStatus queryComponentStatus(long id);
    
    /**
     * query status page incidents.
     * @return status page incidents
     */
    List<StatusPageIncident> queryStatusPageIncidents();
    
    /**
     * query status page incident.
     * @param id status page incident id
     * @return status page incident
     */
    StatusPageIncident queryStatusPageIncident(long id);
    
    /**
     * save status page incident.
     * @param statusPageIncident status page incident
     */
    void newStatusPageIncident(StatusPageIncident statusPageIncident);
    
    /**
     * update status page incident.
     * @param statusPageIncident status page incident
     */
    void updateStatusPageIncident(StatusPageIncident statusPageIncident);
    
    /**
     * delete status page incident.
     * @param id status page incident id
     */
    void deleteStatusPageIncident(long id);
}
