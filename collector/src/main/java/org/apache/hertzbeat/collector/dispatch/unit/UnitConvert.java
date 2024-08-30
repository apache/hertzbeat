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

package org.apache.hertzbeat.collector.dispatch.unit;

/**
 * the interface of unit convert
 * Unit conversion interface classes and deal with mon. org.apache.hertzbeat.com entity.
 * The job. The Metrics# units
 */
public interface UnitConvert {

    /**
     * convert originUnit value to newUnit value
     *
     * @param value      The collected value
     * @param originUnit The unit to which the original value corresponds.
     * @param newUnit    The unit to display
     * @return Converted value
     */
    String convert(String value, String originUnit, String newUnit);

    /**
     * check the unit and confirm to use this implement class
     * Checks for units before and after xxx -> xxx, also to make sure that the implementation class is being used
     *
     * @param unit unit
     * @return true/false
     */
    boolean checkUnit(String unit);
}
