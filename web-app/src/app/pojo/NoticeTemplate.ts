export class NoticeTemplate {
  id!: number;
  name!: string;
  // 通知信息方式: 0-手机短信 1-邮箱 2-webhook 3-微信公众号 4-企业微信机器人 5-钉钉机器人 6-飞书机器人
  // 7-Telegram机器人 8-SlackWebHook 9-Discord机器人 10-企业微信应用消息 11-华为云SMN
  type!: number;
  preset!: boolean;
  creator!: string;
  modifier!: string;
  content!: string;
  gmtCreate!: number;
  gmtUpdate!: number;
}
