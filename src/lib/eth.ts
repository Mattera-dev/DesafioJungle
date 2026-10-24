const SCALE = 1_000_000n; 

export function parseEthToMicro(value: string | number): bigint {
  const clean = String(value ?? '0')
    .trim()
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  if (!clean || clean === '.' || clean === '-') return 0n;
  const negative = clean.startsWith('-');
  const unsigned = negative ? clean.slice(1) : clean;
  const [intPart = '0', fracPart = ''] = unsigned.split('.');
  const paddedFrac = (fracPart + '000000').slice(0, 6);
  const result = BigInt(intPart || '0') * SCALE + BigInt(paddedFrac || '0');
  return negative ? -result : result;
}

export function formatMicroToEth(micro: bigint, minDecimals = 2, maxDecimals = 6): string {
  const negative = micro < 0n;
  const abs = negative ? -micro : micro;
  const intPart = abs / SCALE;
  const fracPart = abs % SCALE;
  let fracStr = fracPart.toString().padStart(6, '0').slice(0, maxDecimals);
  while (fracStr.length > minDecimals && fracStr.endsWith('0')) {
    fracStr = fracStr.slice(0, -1);
  }
  return `${negative ? '-' : ''}${intPart.toString()}.${fracStr}`;
}

export function addEth(a: string, b: string): string {
  return formatMicroToEth(parseEthToMicro(a) + parseEthToMicro(b));
}

export function subEth(a: string, b: string): string {
  const diff = parseEthToMicro(a) - parseEthToMicro(b);
  return formatMicroToEth(diff < 0n ? 0n : diff);
}

export function mulEth(priceEth: string, quantity: number): string {
  return formatMicroToEth(parseEthToMicro(priceEth) * BigInt(Math.max(0, Math.floor(quantity))));
}

export function percentEth(amountEth: string, percent: number): string {
  const micro = parseEthToMicro(amountEth);
  const discounted = (micro * BigInt(Math.round(percent * 100))) / 10000n;
  return formatMicroToEth(discounted);
}

export function compareEth(a: string, b: string): number {
  const ma = parseEthToMicro(a);
  const mb = parseEthToMicro(b);
  if (ma < mb) return -1;
  if (ma > mb) return 1;
  return 0;
}

export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(' ');
}

