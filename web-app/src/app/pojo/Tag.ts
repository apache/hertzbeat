export class Tag {
  id!: number;
  name!: string;
  value!: string;
  color: string = '#ff4081';
  // 标记类型 0:监控自动生成(monitorId,monitorName) 1: 用户生成 2: 系统预置
  type!: number;
  creator!: string;
  modifier!: string;
  gmtCreate!: number;
  gmtUpdate!: number;
}
