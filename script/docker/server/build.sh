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
# 
cd `dirname $0`
# current dir
CURRENT_DIR=`pwd`
# cd dist dir
cd ../../../dist
# auto detect hertzbeat version
VERSION=`ls apache-hertzbeat-*-incubating-docker-compose.tar.gz| awk -F"-" '{print $3}'`

# compile context dir
CONTEXT_DIR=`pwd`

COMMAND="docker buildx build --platform ${IMAGE_PLATFORM:-linux/arm64,linux/amd64} -t apache/hertzbeat:$VERSION -f $CURRENT_DIR/Dockerfile $CONTEXT_DIR  --push=${IMAGE_PUSH:-true} --load=${IMAGE_LOAD:-false}"

#COMMAND="docker buildx build --platform linux/arm64,linux/amd64 -t apache/hertzbeat:latest -f $CURRENT_DIR/Dockerfile $CONTEXT_DIR  --push"

#COMMAND="docker buildx build --platform linux/arm64,linux/amd64 -t quay.io/tancloud/hertzbeat:$VERSION -f $CURRENT_DIR/Dockerfile $CONTEXT_DIR  --push"

#COMMAND="docker buildx build --platform linux/arm64,linux/amd64 -t quay.io/tancloud/hertzbeat:latest -f $CURRENT_DIR/Dockerfile $CONTEXT_DIR  --push"

# Build Local

#COMMAND="docker build -t apache/hertzbeat:$VERSION -f $CURRENT_DIR/Dockerfile $CONTEXT_DIR "

#COMMAND="docker tag apache/hertzbeat:$VERSION apache/hertzbeat:${IMAGE_VERSION:-latest}"

echo "$COMMAND"

$COMMAND

#docker build -t apache/hertzbeat:latest -f $CURRENT_DIR/Dockerfile $CONTEXT_DIR 
