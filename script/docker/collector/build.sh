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
VERSION=`ls apache-hertzbeat-collector-*-incubating-bin.tar.gz| awk -F"-" '{print $4}'`
# use the version param
if [ -n "$1" ]; then
    VERSION="$1";
fi

# docker compile context
CONTEXT_DIR=`pwd`

COMMAND="docker buildx build --platform linux/arm64,linux/amd64 -t apache/hertzbeat-collector:$VERSION -f $CURRENT_DIR/Dockerfile $CONTEXT_DIR --build-arg VERSION="$VERSION" --push"

#COMMAND="docker buildx build --platform linux/arm64,linux/amd64 -t apache/hertzbeat-collector:latest -f $CURRENT_DIR/Dockerfile $CONTEXT_DIR --build-arg VERSION="$VERSION" --push"

#COMMAND="docker buildx build --platform linux/arm64,linux/amd64 -t quay.io/tancloud/hertzbeat-collector:$VERSION -f $CURRENT_DIR/Dockerfile $CONTEXT_DIR --build-arg VERSION="$VERSION" --push"

#COMMAND="docker buildx build --platform linux/arm64,linux/amd64 -t quay.io/tancloud/hertzbeat-collector:latest -f $CURRENT_DIR/Dockerfile $CONTEXT_DIR --build-arg VERSION="$VERSION" --push"

# Build Local

#COMMAND="docker build -t apache/hertzbeat-collector:$VERSION -f $CURRENT_DIR/Dockerfile $CONTEXT_DIR --build-arg VERSION="$VERSION" "

echo "$COMMAND"

$COMMAND

#docker build -t apache/hertzbeat-collector:latest -f $CURRENT_DIR/Dockerfile $CONTEXT_DIR 
