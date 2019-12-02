const fs = require('fs')
const path = require('path')
const zlib = require('../../src/zlib')
const { describe, it } = require('mocha')
const { deepStrictEqual } = require('assert')
const chunker = require('../../src/chunker')

describe('#splitString', function () {
  ;[
    {
      given: 'abcdabcd',
      expected: ['YWJj', 'ZGFi', 'Y2Q='],
      chunkSize: 4
    },
    {
      given: 'a😊c',
      expected: ['YfCf', 'mIpj'],
      chunkSize: 4
    },
    {
      given: 'a😊cdefg',
      expected: ['YfCfmIpj', 'ZGVmZw=='],
      chunkSize: 8
    },
    {
      given: '😃🐇🐴:!',
      expected: ['8J+Y', 'g/Cf', 'kIfw', 'n5C0', 'OiE='],
      chunkSize: 4
    },
    {
      given: 'åß∂ƒ©˙∆˚¬…æ',
      expected: ['w6XDn+KIgsaSwqnL', 'meKIhsuawqzigKbD', 'pg=='],
      chunkSize: 16
    },
    {
      given: '',
      expected: [''],
      chunkSize: 4
    },
    {
      given: 'å',
      expected: ['w6U='],
      chunkSize: 64
    }
  ].forEach(({ given, chunkSize, expected }, i) => {
    it(`test case: ${i + 1}`, function () {
      const result = chunker.split(Buffer.from(given), chunkSize)
      deepStrictEqual(result, expected)
      deepStrictEqual(chunker.join(result).toString(), given)
    })
  })

  it('correctly splits and join a big compressed file', async () => {
    const bigFile = fs.readFileSync(path.join(__dirname, '..', 'big-file.data'))
    const compressed = await zlib.compress(bigFile)
    const splitted = chunker.split(compressed, 1000)
    const joined = chunker.join(splitted)
    const decompressed = await zlib.decompress(joined)

    if (bigFile.toString() !== decompressed.toString()) {
      throw new Error('Result is not equal')
    }
  })
})
