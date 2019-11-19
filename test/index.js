const { strictEqual, deepStrictEqual } = require('assert')
const fs = require('fs')
const { describe, it } = require('mocha')
const { createChunks, createReceiver } = require('..')
const createHash = require('../src/create-hash')

const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }

  return a
}

describe('#createChunks', () => {
  const testCases = [
    {
      chunkSize: 4,
      content: 'abcdef',
      expected: ['abcd', 'ef']
    },
    {
      chunkSize: 4,
      content: 'abc',
      expected: ['abc']
    },
    {
      chunkSize: 16,
      content: 'abcde',
      expected: ['abcde']
    },
    {
      chunkSize: 4,
      content: '😃🐇🐴:!',
      expected: ['😃', '🐇', '🐴', ':!']
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
    { chunksData: ['abcd', 'ef'], expected: 'abcdef' },
    { chunksData: ['abc'], expected: 'abc' },
    { chunksData: ['abcd', 'abcd', 'abcd'], expected: 'abcdabcdabcd' },
    { chunksData: [''], expected: '' },
    { chunksData: ['😃', '🐇', '🐴', ':!'], expected: '😃🐇🐴:!' }
  ]

  const fixtureChunks = (chunksData) => {
    const content = Buffer.from(chunksData.join(''))
    const id = createHash(content)
    const total = chunksData.length
    const chunks = chunksData.map((data, index) => ({
      id,
      total,
      index,
      data
    }))

    return { id, total, chunks }
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
    const chunksData = ['😃', '🐇', '🐴', ':!']
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
    { content: 'åß∂ƒ©˙∆˚¬…æ', chunkSize: 4 },
    { content: 'ЁЂЃЄЅІЇЈЉЊЋЌЍЎЏАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя', chunkSize: 16 },
    { content: '<foo val=“bar” />', chunkSize: 4 },
    { content: '찦차를 타고 온 펲시맨과 쑛다리 똠방각하', chunkSize: 4 },
    { content: 'Ṱ̺̺̕o͞ ̷i̲̬͇̪͙n̝̗͕v̟̜̘̦͟o̶̙̰̠kè͚̮̺̪̹̱̤ ̖t̝͕̳̣̻̪͞h̼͓̲̦̳̘̲e͇̣̰̦̬͎ ̢̼̻̱̘h͚͎͙̜̣̲ͅi̦̲̣̰̤v̻͍e̺̭̳̪̰-m̢iͅn̖̺̞̲̯̰d̵̼̟͙̩̼̘̳ ̞̥̱̳̭r̛̗̘e͙p͠r̼̞̻̭̗e̺̠̣͟s̘͇̳͍̝͉e͉̥̯̞̲͚̬͜ǹ̬͎͎̟̖͇̤t͍̬̤͓̼̭͘ͅi̪̱n͠g̴͉ ͏͉ͅc̬̟h͡a̫̻̯͘o̫̟̖͍̙̝͉s̗̦̲.̨̹͈̣', chunkSize: 4 },
    { content: 'Craig Cockburn, Software Specialist', chunkSize: 8 },
    { content: ',./;[]\\-=<>?:"{}|_+ !@#$%^&*()`~', chunkSize: 4 }
  ]

  testCases.forEach(({ content, chunkSize }, i) => {
    it(`testCase ${i + 1}: should receive the same that was sent`, async () => {
      const chunks = await createChunks({
        content: Buffer.from(content),
        chunkSize
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
      chunkSize: 4,
      compress: false
    })

    const { id, total } = chunks[0]

    const receiver = createReceiver({ id, total })

    chunks.forEach(receiver.addChunk)

    strictEqual(await receiver.toString(), content, 'result string is ok')
  })
})

describe.skip('data bigger than 860bytes compression', () => {
  const content = fs.readFileSync(require('path').join(__dirname, 'big-file.data'))

  it('should correctly chunk a big file', async () => {
    const chunks = await createChunks({
      content,
      chunkSize: 30000
    })

    const { id, total } = chunks[0]

    const receiver = createReceiver({ id, total })

    chunks.forEach(receiver.addChunk)

    const result = await receiver.toString()

    if (result !== content.toString()) {
      throw new Error('Result is not equal')
    }

    // strictEqual(result, content.toString(), 'result string is ok')
  })
})
