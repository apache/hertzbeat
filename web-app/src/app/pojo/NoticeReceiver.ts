/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export class NoticeReceiver {
  id!: number;
  name!: string;
  // notification mode: 0-sms 1-email 2-webhook 3-wechat public account 4-work wechat robot 5-Dingding robot 6-Feishu robot
  // 7-Telegram robot 8-SlackWebHook 9-Discord robot 10-work wechat app message 11-Huawei cloud SMN 12-ServerChan 13-Gotify
  type: number = 1;
  phone!: string;
  email!: string;
  tgBotToken!: string;
  tgUserId!: string;
  tgMessageThreadId!: string;
  userId!: string;
  slackWebHookUrl!: string;
  discordChannelId!: string;
  discordBotToken!: string;
  hookUrl!: string;
  wechatId!: string;
  accessToken!: string;
  corpId!: string;
  agentId!: number;
  appSecret!: string;
  partyId!: string;
  tagId!: string;
  smnAk!: string;
  smnSk!: string;
  smnProjectId!: string;
  smnRegion!: string;
  smnTopicUrn!: string;
  serverChanToken!: string;
  gotifyToken!: string;
  creator!: string;
  modifier!: string;
  gmtCreate!: number;
  gmtUpdate!: number;
}
