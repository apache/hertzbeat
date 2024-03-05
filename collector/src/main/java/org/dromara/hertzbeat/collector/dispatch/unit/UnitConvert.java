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

package org.dromara.hertzbeat.collector.dispatch.unit;

/**
 * the interface of unit convert
 * 单位转换的接口类，处理 org.dromara.hertzbeat.common.entity.job.Metrics#units
 * @author ceilzcx
 *
 */
public interface UnitConvert {

    /**
     * convert originUnit value to newUnit value
     * 将当前originUnit对应的value转换为newUnit对应的value
     * @param value 收集到的值
     * @param originUnit 原值对应的单位
     * @param newUnit 展示的单位
     * @return 转换后的value
     */
    String convert(String value, String originUnit, String newUnit);

    /**
     * check the unit and confirm to use this implement class
     * 检查 xxx -> xxx前后两个单位，也为了确认是否使用该实现类
     * @param unit 单位
     * @return true/false
     */
    boolean checkUnit(String unit);
}
