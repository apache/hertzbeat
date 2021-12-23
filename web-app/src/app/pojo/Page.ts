export class Page<T> {
  content!: T[];
  // 集合总页数
  totalPages!: number;
  // 集合总数
  totalElements!: number;
  // 查询的pageSize
  size!: number;
  // 查询的pageIndex,从0开始
  number!: number;
  // 当前页的集合数量
  numberOfElements!: number;
}
