import { Tag } from './Tag';

export class Monitor {
  id!: number;
  name!: string;
  app!: string;
  host!: string;
  intervals: number = 60;
  // 任务状态 0:未监控,1:可用,2:不可用
  status!: number;
  description!: string;
  creator!: string;
  modifier!: string;
  gmtCreate!: number;
  gmtUpdate!: number;
  tags!: Tag[];
}
