export class NoticeRule {
  id!: number;
  name!: string;
  receiverId!: number;
  receiverName!: string;
  enable: boolean = true;
  // 是否转发所有
  filterAll: boolean = true;
  // 告警级别过滤
  priorities!: number[];
  tags!: TagItem[];
  days!: number[];
  periodStart: Date = new Date(2000, 2, 2, 0, 0, 0);
  periodEnd: Date = new Date(2000, 2, 2, 23, 59, 59);
  creator!: string;
  modifier!: string;
  gmtCreate!: number;
  gmtUpdate!: number;
}

export class TagItem {
  name!: string;
  value!: string;
}
