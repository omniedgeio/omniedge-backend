import test from 'japa'
import { ip2long, long2ip, Netmask } from 'netmask'
import { getAvailableIPRange, nextUnassignedIP } from '../utils/ip'

test.group('utils.ip', () => {
  test('available ip range with 0 used ips', (assert) => {
    const block = new Netmask('100.100.0.0/24')
    const ipRange = getAvailableIPRange(ip2long(block.first), ip2long(block.last), [])

    assert.equal(ipRange.length, 1)
    assert.equal(long2ip(ipRange[0][0]), block.first)
    assert.equal(long2ip(ipRange[0][1]), block.last)
  })

  test('available ip range with 1 used ips', (assert) => {
    const block = new Netmask('100.100.0.0/24')
    const ipRange = getAvailableIPRange(
      ip2long(block.first),
      ip2long(block.last),
      ['100.100.0.100'].map((ip) => ip2long(ip))
    )

    assert.equal(ipRange.length, 2)
    assert.equal(long2ip(ipRange[0][0]), block.first)
    assert.equal(long2ip(ipRange[0][1]), '100.100.0.99')
    assert.equal(long2ip(ipRange[1][0]), '100.100.0.101')
    assert.equal(long2ip(ipRange[1][1]), block.last)
  })

  test('available ip range', (assert) => {
    const block = new Netmask('100.100.0.0/24')
    const usedIPs = ['100.100.0.1', '100.100.0.100']
    const ipRange = getAvailableIPRange(
      ip2long(block.first),
      ip2long(block.last),
      usedIPs.map((v) => ip2long(v))
    )

    assert.equal(ipRange.length, 2)
    assert.equal(long2ip(ipRange[0][0]), '100.100.0.2')
    assert.equal(long2ip(ipRange[ipRange.length - 1][0]), '100.100.0.101')
  })

  test('random ip from 256 addresses', (assert) => {
    const usedIPs = ['100.100.0.1', '100.100.0.100']
    const cidr = '100.100.0.0/24'
    const block = new Netmask(cidr)

    const availableIPLength = block.size - usedIPs.length - 2
    for (let i = 0; i < availableIPLength; i++) {
      const nextIP = nextUnassignedIP(cidr, usedIPs)
      assert.isNotNull(nextIP)
      if (nextIP) {
        assert.isTrue(!usedIPs.includes(nextIP), `IP '${nextIP}' is already used`)
        usedIPs.push(nextIP)
      }
    }
    assert.equal(usedIPs.length, block.size - 2)
  })
})
