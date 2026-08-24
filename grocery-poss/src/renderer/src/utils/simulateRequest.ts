export function simulateRequest<T>(result: T, delayMs = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(result), delayMs))
}
