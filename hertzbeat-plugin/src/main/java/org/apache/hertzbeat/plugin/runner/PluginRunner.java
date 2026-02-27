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

package org.apache.hertzbeat.plugin.runner;


import java.util.function.BiConsumer;
import java.util.function.Consumer;
import org.apache.hertzbeat.common.entity.plugin.PluginContext;

/**
 * plugin runner
 */
public interface PluginRunner {

    /**
     * execute plugin
     * @param clazz plugin class
     * @param execute plugin execution logic
     * @param <T> plugin type
     */
    <T> void pluginExecute(Class<T> clazz, Consumer<T> execute);

    /**
     * execute plugin with params
     * @param clazz plugin class
     * @param execute plugin execution logic
     * @param <T> plugin type
     */
    <T> void pluginExecute(Class<T> clazz, BiConsumer<T, PluginContext> execute);

}
