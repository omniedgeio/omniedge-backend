import { ip2long, long2ip, Netmask } from 'netmask'

export function getAvailableIPRange(first: number, last: number, usedIPsLong: number[]) {
  const availableIPRange: number[][] = []
  usedIPsLong.sort((a, b) => a - b)

  if (usedIPsLong.length == 0) {
    availableIPRange.push([first, last])
    return availableIPRange
  }

  if (usedIPsLong[0] !== first) {
    availableIPRange.push([first, usedIPsLong[0] - 1])
  }

  for (let i = 0; i < usedIPsLong.length - 1; i++) {
    if (usedIPsLong[i] + 1 !== usedIPsLong[i + 1]) {
      availableIPRange.push([usedIPsLong[i] + 1, usedIPsLong[i + 1] - 1])
    }
  }

  if (usedIPsLong[usedIPsLong.length - 1] !== last) {
    availableIPRange.push([usedIPsLong[usedIPsLong.length - 1] + 1, last])
  }
  return availableIPRange
}

export function nextUnassignedIP(ipRange: string, usedIPs: string[]): string | null {
  const block = new Netmask(ipRange)
  const first = ip2long(block.first)
  const last = ip2long(block.last)

  const availableIPLength = last - first + 1 - usedIPs.length
  if (availableIPLength < 1) {
    return null
  }

  const usedIPsLong: number[] = usedIPs.map((ip) => ip2long(ip))
  const availableIPRange = getAvailableIPRange(first, last, usedIPsLong)

  const randomIndex = Math.floor(Math.random() * (availableIPRange.length - 1))
  const randomIPRange = availableIPRange[randomIndex]
  const randomIP = Math.floor(Math.random() * (randomIPRange[1] - randomIPRange[0])) + randomIPRange[0]

  return long2ip(randomIP)
}
