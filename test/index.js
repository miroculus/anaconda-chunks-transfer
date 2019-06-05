const { strictEqual, deepStrictEqual } = require('assert')
const fs = require('fs')
const { describe, it } = require('mocha')
const { createChunks, createReceiver } = require('..')
const createHash = require('../src/create-hash')
const flatten = require('../src/flatten')

const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }

  return a
}

const rand = (min = 0, max) => Math.floor(Math.random() * (max - min + 1) + min)

describe('#createChunks', () => {
  const testCases = [
    {
      // Even result
      chunkSize: 2,
      content: 'abcdef',
      expected: [
        [97, 98],
        [99, 100],
        [101, 102]
      ]
    },
    {
      // 1-byte chunks
      chunkSize: 1,
      content: 'abc',
      expected: [[97], [98], [99]]
    },
    {
      // Odd result
      chunkSize: 2,
      content: 'abcde',
      expected: [
        [97, 98],
        [99, 100],
        [101]
      ]
    },
    {
      // Empty result
      chunkSize: 3,
      content: '',
      expected: [[]]
    },
    {
      // Bigger chunkSize than content
      chunkSize: 15,
      content: 'abcde',
      expected: [[97, 98, 99, 100, 101]]
    },
    {
      // Even result
      chunkSize: 3,
      content: '😃🐇🐴:!',
      expected: [[240, 159, 152], [131, 240, 159], [144, 135, 240], [159, 144, 180], [58, 33]]
    }
  ]

  testCases.forEach(({ content, chunkSize, expected }, i) => {
    it(`testCase ${i + 1}: should create ${expected.length} chunks with a size of ${chunkSize} bytes`, async () => {
      const chunks = await createChunks({
        content: Buffer.from(content),
        chunkSize
      })

      strictEqual(chunks.length, expected.length, 'results amount')

      expected.forEach((data, index) => {
        const chunk = chunks[index]
        strictEqual(chunk.total, expected.length, 'chunk.total value')
        strictEqual(chunk.index, index, 'chunk.index value')
        deepStrictEqual(chunk.data, data)
      })
    })
  })
})

describe('#createReceiver', () => {
  const testCases = [
    { chunksData: [[97, 98], [99, 100], [101, 102]], expected: 'abcdef' },
    { chunksData: [[97], [98], [99]], expected: 'abc' },
    { chunksData: [[97, 98], [99, 100], [101]], expected: 'abcde' },
    { chunksData: [[]], expected: '' },
    { chunksData: [[97, 98, 99, 100, 101]], expected: 'abcde' },
    {
      chunksData: [
        [240, 159, 152], [131, 240, 159], [144, 135, 240], [159, 144, 180], [58, 33]
      ],
      expected: '😃🐇🐴:!'
    }
  ]

  const fixtureChunks = (chunksData) => {
    const buff = Buffer.from(flatten(chunksData))
    const id = createHash(buff)
    const total = chunksData.length
    const chunks = chunksData.map((data, index) => ({
      id,
      total,
      index,
      data
    }))

    return { buff, id, total, chunks }
  }

  testCases.forEach(({ chunksData, expected }, i) => {
    const { id, total, chunks } = fixtureChunks(chunksData)

    it(`testCase ${i + 1}: should receive ${total} chunks`, async () => {
      const receiver = createReceiver({ id, total })

      chunks.forEach(receiver.addChunk)

      strictEqual(receiver.done(), true, 'chunks should have been received')
      strictEqual(await receiver.verify(), true, 'receiver should verify result')
      strictEqual(await receiver.toString(), expected, 'result string is ok')
    })
  })

  it('should correctly sort result when unordered chunks submitted', async () => {
    const chunksData = [
      [240, 159, 152], [131, 240, 159], [144, 135, 240], [159, 144, 180], [58, 33]
    ]
    const expected = '😃🐇🐴:!'
    const { id, total, chunks } = fixtureChunks(chunksData)

    const receiver = createReceiver({ id, total })

    shuffle(chunks).forEach(receiver.addChunk)

    strictEqual(receiver.done(), true, 'chunks should have been received')
    strictEqual(await receiver.verify(), true, 'receiver should verify result')
    strictEqual(await receiver.toString(), expected, 'result string is ok')
  })
})

describe('send and receive operation', () => {
  const testCases = [
    'åß∂ƒ©˙∆˚¬…æ',
    'ЁЂЃЄЅІЇЈЉЊЋЌЍЎЏАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя',
    '<foo val=“bar” />',
    '찦차를 타고 온 펲시맨과 쑛다리 똠방각하',
    'Ṱ̺̺̕o͞ ̷i̲̬͇̪͙n̝̗͕v̟̜̘̦͟o̶̙̰̠kè͚̮̺̪̹̱̤ ̖t̝͕̳̣̻̪͞h̼͓̲̦̳̘̲e͇̣̰̦̬͎ ̢̼̻̱̘h͚͎͙̜̣̲ͅi̦̲̣̰̤v̻͍e̺̭̳̪̰-m̢iͅn̖̺̞̲̯̰d̵̼̟͙̩̼̘̳ ̞̥̱̳̭r̛̗̘e͙p͠r̼̞̻̭̗e̺̠̣͟s̘͇̳͍̝͉e͉̥̯̞̲͚̬͜ǹ̬͎͎̟̖͇̤t͍̬̤͓̼̭͘ͅi̪̱n͠g̴͉ ͏͉ͅc̬̟h͡a̫̻̯͘o̫̟̖͍̙̝͉s̗̦̲.̨̹͈̣',
    'Craig Cockburn, Software Specialist',
    ',./;[]\\-=<>?:"{}|_+ !@#$%^&*()`~'
  ]

  testCases.forEach((content, i) => {
    it(`testCase ${i + 1}: should receive the same that was sent`, async () => {
      const chunks = await createChunks({
        content: Buffer.from(content),
        chunkSize: rand(1, Buffer.byteLength(content))
      })

      const { id, total } = chunks[0]

      const receiver = createReceiver({ id, total })

      chunks.forEach(receiver.addChunk)

      strictEqual(await receiver.toString(), content, 'result string is ok')
    })
  })

  it(`should send and receive uncompressed content`, async () => {
    const content = 'Some testing string'

    const chunks = await createChunks({
      content: Buffer.from(content),
      chunkSize: rand(1, Buffer.byteLength(content)),
      compress: false
    })

    const { id, total } = chunks[0]

    const receiver = createReceiver({ id, total })

    chunks.forEach(receiver.addChunk)

    strictEqual(await receiver.toString(), content, 'result string is ok')
  })
})

describe('data bigger than 860bytes compression', () => {
  const content = fs.readFileSync(require('path').join(__dirname, 'big-file.data'))

  it('should correctly chunk a big file', async () => {
    const chunks = await createChunks({
      content,
      chunkSize: rand(1, Buffer.byteLength(content))
    })

    const { id, total } = chunks[0]

    const receiver = createReceiver({ id, total })

    chunks.forEach(receiver.addChunk)

    strictEqual(await receiver.toString(), content.toString(), 'result string is ok')
  })
})
