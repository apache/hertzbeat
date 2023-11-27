#!/bin/bash

# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# 项目名称
APPLICATION="${project.artifactId}"

# 项目启动jar包名称
APPLICATION_JAR="${project.build.finalName}.jar"

# 通过项目名称查找到PI，然后kill -9 pid
PID=$(ps -ef | grep java | grep "${APPLICATION_JAR}" | grep -v grep | awk '{ print $2 }')
if [[ -z "$PID" ]]
then
    echo HertzBeat ${APPLICATION} is already stopped
else
    echo kill  ${PID}
    kill -9 ${PID}
    echo Shutdown HertzBeat ${APPLICATION} Success!
fi