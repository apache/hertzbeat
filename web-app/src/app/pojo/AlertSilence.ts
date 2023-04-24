import { TagItem } from './NoticeRule';

export class AlertSilence {
  id!: number;
  name!: string;
  enable: boolean = true;
  matchAll: boolean = true;
  type: number = 0;
  times!: number;
  priorities!: number[];
  tags!: TagItem[];
  days!: number[];
  periodStart: Date = new Date();
  periodEnd: Date = new Date();
  creator!: string;
  modifier!: string;
  gmtCreate!: number;
  gmtUpdate!: number;
}
