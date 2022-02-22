export class NoticeReceiver {
  id!: number;
  name!: string;
  // 通知信息方式: 0-手机短信 1-邮箱 2-webhook 3-微信公众号
  type: number = 1;
  phone!: string;
  email!: string;
  hookUrl!: string;
  wechatId!: string;
  accessToken!: string;
  creator!: string;
  modifier!: string;
  gmtCreate!: number;
  gmtUpdate!: number;
}
