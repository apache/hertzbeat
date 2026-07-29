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

FROM eclipse-temurin:25-jdk

LABEL org.opencontainers.image.authors="Apache HertzBeat <dev@hertzbeat.apache.org>"

ARG TARGETARCH

# Install SSH
RUN  sed -i 's#http://#https://#g' /etc/apt/sources.list.d/ubuntu.sources && \
    apt-get update && apt-get install -y openssh-server
RUN mkdir /var/run/sshd

ADD apache-hertzbeat-collector-*-bin-linux_${TARGETARCH}.tar.gz /opt/collector-package/

RUN package_dir="$(find /opt/collector-package -mindepth 1 -maxdepth 1 -type d \
        -name 'apache-hertzbeat-collector-*' -print -quit)" \
    && test -n "$package_dir" \
    && mv "$package_dir" /opt/hertzbeat-collector \
    && rmdir /opt/collector-package

ENV JAVA_OPTS=""
ENV TZ=Asia/Shanghai
ENV LANG=en_US.UTF-8

WORKDIR /opt/hertzbeat-collector

ENTRYPOINT ["./bin/entrypoint.sh"]
