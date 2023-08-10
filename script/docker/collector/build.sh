#!/bin/sh

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
# 调整脚本目录
cd `dirname $0`
# 当前脚本目录
CURRENT_DIR=`pwd`
# 跳转制品目录
cd ../../../collector/target
# 自动捕获hertzbeat版本
VERSION=`ls *.tar| awk -F"-" '{print $3}' | awk -F".tar" '{print $1}'`
# 强制使用版本参数
if [ -n "$1" ]; then
    VERSION="$1";
fi

# 编译上下文目录
CONTEXT_DIR=`pwd`

COMMAND="docker buildx build --platform linux/arm64,linux/amd64 -t tancloud/hertzbeat-collector:v$VERSION -f $CURRENT_DIR/Dockerfile $CONTEXT_DIR --build-arg VERSION="$VERSION" --push"

#COMMAND="docker buildx build --platform linux/arm64,linux/amd64 -t tancloud/hertzbeat-collector:latest -f $CURRENT_DIR/Dockerfile $CONTEXT_DIR --build-arg VERSION="$VERSION" --push"

#COMMAND="docker buildx build --platform linux/arm64,linux/amd64 -t quay.io/tancloud/hertzbeat-collector:v$VERSION -f $CURRENT_DIR/Dockerfile $CONTEXT_DIR --build-arg VERSION="$VERSION" --push"

#COMMAND="docker buildx build --platform linux/arm64,linux/amd64 -t quay.io/tancloud/hertzbeat-collector:latest -f $CURRENT_DIR/Dockerfile $CONTEXT_DIR --build-arg VERSION="$VERSION" --push"

echo "$COMMAND"

$COMMAND

#docker build -t tancloud/hertzbeat-collector:latest -f $CURRENT_DIR/Dockerfile $CONTEXT_DIR --build-arg VERSION="$VERSION"
