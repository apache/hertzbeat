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
  // 通知信息方式: 0-手机短信 1-邮箱 2-webhook 3-微信公众号 4-企业微信机器人 5-钉钉机器人 6-飞书机器人
  // 7-Telegram机器人 8-SlackWebHook 9-Discord机器人 10-企业微信应用消息 11-华为云SMN 12-Server酱 13-Gotify
  type: number = 1;
  phone!: string;
  email!: string;
  tgBotToken!: string;
  tgUserId!: string;
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
