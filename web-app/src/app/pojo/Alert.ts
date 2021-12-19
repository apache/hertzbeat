export class Alert {
  id!: number;
  target!: string;
  monitorId!: number;
  monitorName!: string;
  // 告警级别 0:高-emergency-紧急告警-红色 1:中-critical-严重告警-橙色 2:低-warning-警告告警-黄色
  priority: number = 2;
  // 告警状态: 0-正常告警(未读)  3-已读已知
  status!: number;
  content!: string;
  times!: number;
  gmtCreate!: number;
}
