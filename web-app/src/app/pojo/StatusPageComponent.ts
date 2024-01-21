import { TagItem } from './NoticeRule';

export class StatusPageComponent {
  id!: number;
  orgId!: number;
  name!: string;
  desc!: string;
  tag!: TagItem;
  // calculate status method: 0-auto 1-manual
  method: number = 0;
  // config state when use manual method: 0-Normal 1-Abnormal 2-Suspended
  configState: number = 0;
  // component status when use auto method: 0-Normal 1-Abnormal 2-Suspended
  currentState: number = 0;
  creator!: string;
  modifier!: string;
  gmtCreate!: number;
  gmtUpdate!: number;
}
