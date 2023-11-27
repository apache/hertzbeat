export class NoticeRule {
  id!: number;
  name!: string;
  receiverId!: number;
  receiverName!: string;
  templateId!: number | null;
  templateName!: string | null;
  enable: boolean = true;
  // 是否转发所有
  filterAll: boolean = true;
  // 告警级别过滤
  priorities!: number[];
  tags!: TagItem[];
  days!: number[];
  periodStart!: Date;
  periodEnd!: Date;
  creator!: string;
  modifier!: string;
  gmtCreate!: number;
  gmtUpdate!: number;
}

export class TagItem {
  name!: string;
  value!: string;
}
