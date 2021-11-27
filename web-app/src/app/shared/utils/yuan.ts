/**
 * 转化成RMB元字符串
 *
 * @param digits 当数字类型时，允许指定小数点后数字的个数，默认2位小数
 */
export function yuan(value: number | string, digits: number = 2): string {
  if (typeof value === 'number') {
    value = value.toFixed(digits);
  }
  return `&yen ${value}`;
}
