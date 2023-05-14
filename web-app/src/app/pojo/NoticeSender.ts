export class NoticeSender {
  id!: number;
  name!: string;
  // 通知信息方式: 1-短信 2-邮箱
  type: number = 2;
  emailHost!: string;
  emailPort!: number;
  emailUsername!: string;
  emailPassword!: string;
  emailEnable!: boolean;
  creator!: string;
  modifier!: string;
  gmtCreate!: number;
  gmtUpdate!: number;
}
