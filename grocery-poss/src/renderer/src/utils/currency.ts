export function formatLkr(value: number): string {
  return value.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export function formatLkrAmount(value: number): string {
  return value.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}
