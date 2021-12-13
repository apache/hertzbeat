export class Alert {
  id!: number;
  target!: string;
  monitorId!: number;
  monitorName!: string;
  priority: number = 2;
  status!: number;
  content!: string;
  times!: number;
  gmtCreate!: number;
}
