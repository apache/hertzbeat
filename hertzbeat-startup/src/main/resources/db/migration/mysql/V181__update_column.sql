-- Licensed to the Apache Software Foundation (ASF) under one
-- or more contributor license agreements.  See the NOTICE file
-- distributed with this work for additional information
-- regarding copyright ownership.  The ASF licenses this file
-- to you under the Apache License, Version 2.0 (the
-- "License"); you may not use this file except in compliance
-- with the License.  You may obtain a copy of the License at
--
--   http://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing,
-- software distributed under the License is distributed on an
-- "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF
-- ANY KIND, either express or implied.  See the License for the
-- specific language governing permissions and limitations
-- under the License.

-- ensure every sql can rerun without error

-- Update TYPE column comment to include all notification types
ALTER TABLE hzb_notice_receiver
MODIFY COLUMN TYPE TINYINT COMMENT 'Notification information method: 0-SMS 1-Email 2-webhook 3-WeChat Official Account 4-Enterprise WeChat Robot 5-DingTalk Robot 6-FeiShu Robot 7-Telegram Bot 8-SlackWebHook 9-Discord Bot 10-Enterprise WeChat app message 11-Slack 12-Discord 13-Gotify 14-FeiShu app message';

-- Add FeiShu app message fields to notice_receiver table
ALTER TABLE hzb_notice_receiver
ADD COLUMN APP_ID VARCHAR(255) COMMENT 'FeiShu app id: The notification method is valid for FeiShu app message';

ALTER TABLE hzb_notice_receiver
ADD COLUMN LARK_RECEIVE_TYPE TINYINT COMMENT 'FeiShu app message receiveType: 0-user 1-chat 2-party 3-all';

ALTER TABLE hzb_notice_receiver
ADD COLUMN CHAT_ID VARCHAR(255) COMMENT 'FeiShu app message chatId: The notification method is valid for FeiShu app message';
