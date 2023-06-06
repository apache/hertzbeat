export class EmailNoticeSender {
  id!: number;
  emailHost!: string;
  emailPort!: number;
  emailUsername!: string;
  emailPassword!: string;
  emailSsl: boolean = true;
  enable!: boolean;
  creator!: string;
  modifier!: string;
  gmtCreate!: number;
  gmtUpdate!: number;
}
