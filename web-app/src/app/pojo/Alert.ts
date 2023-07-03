export class Alert {
  id!: number;
  target!: string;
  monitorId!: number;
  monitorName!: string;
  // 告警级别 0:高-emergency-紧急告警-红色 1:中-critical-严重告警-橙色 2:低-warning-警告告警-黄色
  priority: number = 2;
  // 告警状态: 0-正常告警(待处理) 1-阈值触发但未达到告警次数 2-恢复告警 3-已处理
  status!: number;
  content!: string;
  // alarm times
  times!: number;
  firstAlarmTime!: number;
  lastAlarmTime!: number;
  tags!: Record<string, string>;
  gmtCreate!: number;
  gmtUpdate!: number;
  tmp!: any;
}
