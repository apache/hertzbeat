import { Tag } from './Tag';

export class Monitor {
  id!: number;
  name!: string;
  app!: string;
  host!: string;
  intervals: number = 60;
  // 监控状态 0:未监控,1:可用,2:不可用,3:不可达,4:挂起
  status!: number;
  description!: string;
  creator!: string;
  modifier!: string;
  gmtCreate!: number;
  gmtUpdate!: number;
  tags!: Tag[];
}
