# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

FROM docker.io/library/ubuntu:24.04@sha256:68ee22004a9109b44973313b02ff7b1de250f1de0f5ecb628d73f579aaff33ac

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install --yes --no-install-recommends \
        openssh-server \
        procps \
        util-linux \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /run/sshd \
    && printf 'PermitRootLogin yes\nPasswordAuthentication yes\nUsePAM no\n' \
        > /etc/ssh/sshd_config.d/hertzbeat-e2e.conf

EXPOSE 22

CMD ["/usr/sbin/sshd", "-D", "-e"]
