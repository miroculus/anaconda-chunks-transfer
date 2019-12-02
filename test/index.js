const { strictEqual, deepStrictEqual } = require('assert')
const fs = require('fs')
const path = require('path')
const { describe, it } = require('mocha')
const { createChunks, createReceiver } = require('..')
const createHash = require('../src/create-hash')

describe('#createChunks', () => {
  const testCases = [
    {
      chunkSize: 4,
      content: 'abcdef',
      expected: ['YWJj', 'ZGVm']
    },
    {
      chunkSize: 4,
      content: 'abc',
      expected: ['YWJj']
    },
    {
      chunkSize: 16,
      content: 'abcde',
      expected: ['YWJjZGU=']
    },
    {
      chunkSize: 4,
      content: '😃🐇🐴:!',
      expected: ['8J+Y', 'g/Cf', 'kIfw', 'n5C0', 'OiE=']
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
        deepStrictEqual(chunk.data, data)
        strictEqual(chunk.index, index, 'chunk.index value')
        strictEqual(chunk.total, expected.length, 'chunk.total value')
      })
    })
  })
})

describe('#createReceiver', () => {
  const testCases = [
    { chunksData: ['YWJj', 'ZGVm'], expected: 'abcdef' },
    { chunksData: ['YWJj'], expected: 'abc' },
    { chunksData: [''], expected: '' },
    { chunksData: ['8J+Y', 'g/Cf', 'kIfw', 'n5C0', 'OiE='], expected: '😃🐇🐴:!' }
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

      strictEqual(await receiver.toString(), expected, 'result string is ok')
      strictEqual(receiver.done(), true, 'chunks should have been received')
    })
  })

  it('should correctly sort result when unordered chunks submitted', async () => {
    const chunksData = ['8J+Y', 'g/Cf', 'kIfw', 'n5C0', 'OiE=']
    const expected = '😃🐇🐴:!'
    const { id, total, chunks } = fixtureChunks(chunksData)

    const receiver = createReceiver({ id, total })

    receiver.addChunk(chunks[2])
    receiver.addChunk(chunks[3])
    receiver.addChunk(chunks[1])
    receiver.addChunk(chunks[0])
    receiver.addChunk(chunks[4])

    strictEqual(receiver.done(), true, 'chunks should have been received')
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

describe('data bigger than 860bytes compression', () => {
  const content = fs.readFileSync(path.join(__dirname, 'big-file.data'))

  it('should correctly chunk a big file', async () => {
    const chunks = await createChunks({
      content,
      chunkSize: 300
    })

    const { id, total } = chunks[0]

    const receiver = createReceiver({ id, total })

    chunks.forEach(receiver.addChunk)

    const expected = content.toString()
    const result = await receiver.toString()

    if (result !== expected) {
      throw new Error('Result is not equal')
    }
  })
})
