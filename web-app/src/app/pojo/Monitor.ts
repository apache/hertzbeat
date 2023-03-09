import { Tag } from './Tag';

export class Monitor {
  id!: number;
  name!: string;
  app!: string;
  host!: string;
  intervals: number = 60;
  // 监控状�?0:未监�?1:可用,2:不可�?3:不可�?4:挂起
  status!: number;
  description!: string;
  creator!: string;
  modifier!: string;
  gmtCreate!: number;
  gmtUpdate!: number;
  tags!: Tag[];
}
