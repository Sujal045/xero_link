// Price calculation helper
export function calcPrice(params: {
  pages: number
  copies: number
  printType: 'bw' | 'color'
  sides: 'single' | 'double'
  priceBW: number
  priceColor: number
}): number {
  const baseRate = params.printType === 'bw' ? params.priceBW : params.priceColor
  const sideMultiplier = params.sides === 'double' ? 0.9 : 1
  const platformFee = 2
  return Math.round(
    (params.pages * baseRate * params.copies * sideMultiplier + platformFee) * 100
  ) / 100
}
