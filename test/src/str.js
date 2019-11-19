const { describe, it } = require('mocha')
const { deepStrictEqual } = require('assert')
const { splitString, joinString } = require('../../src/str')

describe('#splitString', function () {
  ;[
    {
      given: 'abcdabcd',
      expected: ['abcd', 'abcd'],
      chunkSize: 4
    },
    {
      given: 'a😊c',
      expected: ['a', '😊', 'c'],
      chunkSize: 4
    },
    {
      given: 'a😊cdefg',
      expected: ['a😊cde', 'fg'],
      chunkSize: 8
    },
    {
      given: '😃🐇🐴:!',
      expected: ['😃', '🐇', '🐴', ':!'],
      chunkSize: 4
    },
    {
      given: 'åß∂ƒ©˙∆˚¬…æ',
      expected: ['åß∂ƒ©˙∆', '˚¬…æ'],
      chunkSize: 16
    },
    {
      given: '',
      expected: [''],
      chunkSize: 4
    },
    {
      given: 'å',
      expected: ['å'],
      chunkSize: 64
    }
  ].forEach(({ given, chunkSize, expected }, i) => {
    it(`test case: ${i + 1}`, function () {
      const result = splitString(given, chunkSize)
      deepStrictEqual(result, expected)
      deepStrictEqual(joinString(result), given)
    })
  })
})
