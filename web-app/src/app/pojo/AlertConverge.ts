import { TagItem } from './NoticeRule';

export class AlertConverge {
  id!: number;
  name!: string;
  enable: boolean = true;
  matchAll: boolean = true;
  priorities!: number[];
  tags!: TagItem[];
  evalInterval: number = 14400;
  creator!: string;
  modifier!: string;
  gmtCreate!: number;
  gmtUpdate!: number;
}
