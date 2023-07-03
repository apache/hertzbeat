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

# 重启脚本执行的起始时间
startTime=$(date +%s)
echo -e "\033[0;31mCurrent Time is：$(date "+%Y-%m-%d %H:%M:%S") Restart Now!\033[0m"
./shutdown.sh
echo
sleep 2
echo
./startup.sh
# 重启脚本执行的结束时间
endTime=$(date +%s)
echo -e  "\033[0;31mCurrent Time is：$(date "+%Y-%m-%d %H:%M:%S") Restart Success！Spend $((endTime - startTime)) seconds \033[0m";
