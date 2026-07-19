/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export const noticeReceiverWebhookAuthTypes = ['None', 'Basic', 'Bearer'] as const;
export const noticeReceiverLarkReceiveTypes = [0, 1, 2, 3] as const;
export const noticeReceiverNameMaxLength = 100;
export const noticeReceiverAgentIdMax = 2_147_483_647;

export type WebHookAuthType = (typeof noticeReceiverWebhookAuthTypes)[number];
export type FeiShuReceiveType = (typeof noticeReceiverLarkReceiveTypes)[number];

export type NoticeReceiverOptionKey =
  | 'phone'
  | 'email'
  | 'hookUrl'
  | 'hookAuthType'
  | 'hookAuthToken'
  | 'wechatId'
  | 'appId'
  | 'accessToken'
  | 'tgBotToken'
  | 'tgUserId'
  | 'tgMessageThreadId'
  | 'larkReceiveType'
  | 'userId'
  | 'chatId'
  | 'slackWebHookUrl'
  | 'corpId'
  | 'agentId'
  | 'appSecret'
  | 'partyId'
  | 'tagId'
  | 'discordChannelId'
  | 'discordBotToken'
  | 'smnAk'
  | 'smnSk'
  | 'smnProjectId'
  | 'smnRegion'
  | 'smnTopicUrn'
  | 'serverChanToken'
  | 'gotifyToken';

export const noticeReceiverSecretKeyCatalog = [
  'hookUrl',
  'hookAuthToken',
  'wechatId',
  'accessToken',
  'tgBotToken',
  'slackWebHookUrl',
  'appSecret',
  'discordBotToken',
  'smnAk',
  'smnSk',
  'serverChanToken',
  'gotifyToken'
] as const;
export type NoticeReceiverSecretKey = (typeof noticeReceiverSecretKeyCatalog)[number];

type ReceiverFieldKind = 'text' | 'email' | 'tel' | 'url' | 'password' | 'number' | 'webhookAuth' | 'larkReceiveType';
export type ReceiverFieldDefinition = {
  key: NoticeReceiverOptionKey;
  labelKey: string;
  kind: ReceiverFieldKind;
  required?: boolean;
  secret?: boolean;
};

const secretKeys = new Set<NoticeReceiverSecretKey>(noticeReceiverSecretKeyCatalog);

const field = (
  key: NoticeReceiverOptionKey,
  kind: ReceiverFieldKind = 'text',
  required = true
): ReceiverFieldDefinition => ({
  key,
  kind,
  required,
  secret: secretKeys.has(key as NoticeReceiverSecretKey),
  labelKey: `noticeReceivers.fields.${key}`
});

export const receiverTypeDefinitions = [
  { type: 0, labelKey: 'noticeReceivers.types.sms', fields: [field('phone', 'tel')] },
  { type: 1, labelKey: 'noticeReceivers.types.email', fields: [field('email', 'email')] },
  {
    type: 2,
    labelKey: 'noticeReceivers.types.webhook',
    fields: [
      field('hookUrl', 'password'),
      field('hookAuthType', 'webhookAuth', false),
      field('hookAuthToken', 'password', false)
    ]
  },
  { type: 3, labelKey: 'noticeReceivers.types.wechat', fields: [] },
  {
    type: 4,
    labelKey: 'noticeReceivers.types.wecomRobot',
    fields: [field('wechatId', 'password'), field('phone', 'tel', false), field('userId', 'text', false)]
  },
  {
    type: 5,
    labelKey: 'noticeReceivers.types.dingtalk',
    fields: [
      field('accessToken', 'password'),
      field('appSecret', 'password', false),
      field('phone', 'tel', false),
      field('tgUserId', 'text', false)
    ]
  },
  {
    type: 6,
    labelKey: 'noticeReceivers.types.larkRobot',
    fields: [field('accessToken', 'password'), field('userId', 'text', false)]
  },
  {
    type: 7,
    labelKey: 'noticeReceivers.types.telegram',
    fields: [field('tgBotToken', 'password'), field('tgUserId'), field('tgMessageThreadId', 'text', false)]
  },
  { type: 8, labelKey: 'noticeReceivers.types.slack', fields: [field('slackWebHookUrl', 'password')] },
  {
    type: 9,
    labelKey: 'noticeReceivers.types.discord',
    fields: [field('discordChannelId'), field('discordBotToken', 'password')]
  },
  {
    type: 10,
    labelKey: 'noticeReceivers.types.wecomApp',
    fields: [
      field('corpId'),
      field('agentId', 'number'),
      field('appSecret', 'password'),
      field('userId', 'text', false),
      field('partyId', 'text', false),
      field('tagId', 'text', false)
    ]
  },
  {
    type: 11,
    labelKey: 'noticeReceivers.types.smn',
    fields: [
      field('smnAk', 'password'),
      field('smnSk', 'password'),
      field('smnProjectId'),
      field('smnRegion'),
      field('smnTopicUrn')
    ]
  },
  { type: 12, labelKey: 'noticeReceivers.types.serverChan', fields: [field('serverChanToken', 'password')] },
  { type: 13, labelKey: 'noticeReceivers.types.gotify', fields: [field('gotifyToken', 'password')] },
  {
    type: 14,
    labelKey: 'noticeReceivers.types.larkApp',
    fields: [
      field('appId'),
      field('appSecret', 'password'),
      field('larkReceiveType', 'larkReceiveType'),
      field('userId', 'text', false),
      field('chatId', 'text', false),
      field('partyId', 'text', false)
    ]
  }
] as const satisfies readonly {
  type: number;
  labelKey: string;
  fields: readonly ReceiverFieldDefinition[];
}[];

export type NoticeReceiverType = (typeof receiverTypeDefinitions)[number]['type'];
export type ReceiverTypeDefinition = (typeof receiverTypeDefinitions)[number];
export const noticeReceiverTypes = receiverTypeDefinitions.map(definition => definition.type);

export const noticeReceiverTypeKeys: Record<NoticeReceiverType, string> = {
  0: 'sms',
  1: 'email',
  2: 'webhook',
  3: 'wechat-official',
  4: 'wecom-robot',
  5: 'dingtalk-robot',
  6: 'feishu-robot',
  7: 'telegram-bot',
  8: 'slack-webhook',
  9: 'discord-bot',
  10: 'wecom-app',
  11: 'huawei-smn',
  12: 'server-chan',
  13: 'gotify',
  14: 'feishu-app'
};

const receiverTypeDefinitionByType = new Map(
  receiverTypeDefinitions.map(definition => [definition.type, definition] as const)
);

export function activeNoticeReceiverDefinition(type: NoticeReceiverType) {
  const definition = receiverTypeDefinitionByType.get(type);
  if (!definition) throw new Error('Unknown notice receiver type');
  return definition;
}

export function noticeReceiverSecretKeys(type: NoticeReceiverType) {
  return activeNoticeReceiverDefinition(type)
    .fields.filter(item => item.secret)
    .map(item => item.key as NoticeReceiverSecretKey);
}
