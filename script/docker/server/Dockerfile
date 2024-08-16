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

FROM openjdk:17-slim-buster

MAINTAINER Apache HertzBeat "dev@hertzbeat.apache.org"

# Install SSH And Locales
RUN apt-get update && apt-get install -y openssh-server && apt-get install -y locales
RUN mkdir /var/run/sshd
# Build zh_CN en_US locale resource package
RUN localedef -c -f UTF-8 -i zh_CN zh_CN.UTF-8
RUN localedef -c -f UTF-8 -i en_US en_US.UTF-8

ENV TZ=Asia/Shanghai
ENV LANG=en_US.UTF-8

ADD apache-hertzbeat-1.*-incubating-bin.tar.gz /opt/

RUN mv /opt/apache-hertzbeat-*-incubating-bin /opt/hertzbeat

EXPOSE 1157 1158 22

WORKDIR /opt/hertzbeat/

ENTRYPOINT ["./bin/entrypoint.sh"]
