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

package org.apache.hertzbeat.remoting;

/**
 * Derived from Apache Rocketmq org.apache.rocketmq.remoting.RemotingService
 * remoting service interface
 * @see <a href="https://github.com/apache/rocketmq/blob/develop/remoting/src/main/java/org/apache/rocketmq/remoting/RemotingService.java">RemotingService</a>
 */
public interface RemotingService {

    /**
     * start server
     */
    void start();

    /**
     * shutdown server
     */
    void shutdown();

    /**
     * test use
     * @return is server start
     */
    boolean isStart();
}
