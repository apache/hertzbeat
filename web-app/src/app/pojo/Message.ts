export class Message<T> {
  data!: T;
  msg!: string;
  code: number = 0;
}
