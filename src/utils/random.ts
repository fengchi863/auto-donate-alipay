/**
 * 生成指定范围内的随机整数
 * @param min 最小值（包含）
 * @param max 最大值（包含）
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 随机延迟指定毫秒数
 * @param min 最小延迟（毫秒）
 * @param max 最大延迟（毫秒）
 */
export function randomDelay(min: number, max: number): Promise<void> {
  const delay = randomInt(min, max);
  return new Promise(resolve => setTimeout(resolve, delay));
}
