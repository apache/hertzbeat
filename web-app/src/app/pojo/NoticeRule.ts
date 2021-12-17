export class NoticeRule {
  id!: number;
  name!: string;
  receiverId!: number;
  receiverName!: string;
  enable: boolean = true;
  // 是否转发所有
  filterAll: boolean = true;
  creator!: string;
  modifier!: string;
  gmtCreate!: number;
  gmtUpdate!: number;
}
