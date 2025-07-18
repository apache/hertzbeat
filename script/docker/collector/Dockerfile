# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

FROM openjdk:21-slim-bullseye

MAINTAINER Apache HertzBeat "dev@hertzbeat.apache.org"

ARG VERSION

# Install SSH
RUN apt-get update && apt-get install -y openssh-server 
RUN mkdir /var/run/sshd

ADD apache-hertzbeat-collector-*-incubating-bin.tar.gz /opt/

ENV JAVA_OPTS ""
ENV TZ=Asia/Shanghai
ENV LANG=en_US.UTF-8

WORKDIR /opt/apache-hertzbeat-collector-${VERSION}-incubating-bin/

ENTRYPOINT ["./bin/entrypoint.sh"]
