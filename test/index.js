const { strictEqual, deepStrictEqual } = require('assert')
const fs = require('fs')
const path = require('path')
const { describe, it } = require('mocha')
const { createChunks, joinChunks, createReceiver } = require('..')
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

    return { total, chunks }
  }

  testCases.forEach(({ chunksData, expected }, i) => {
    const { total, chunks } = fixtureChunks(chunksData)

    it(`testCase ${i + 1}: should receive ${total} chunks`, (done) => {
      const receiver = createReceiver()

      receiver.on('message', (result) => {
        try {
          strictEqual(result, expected, 'result string is ok')
          done()
        } catch (err) {
          done(err)
        }
      })

      chunks.forEach(receiver.addChunk)
    })
  })

  it('should correctly sort result when unordered chunks submitted', (done) => {
    const chunksData = ['8J+Y', 'g/Cf', 'kIfw', 'n5C0', 'OiE=']
    const expected = '😃🐇🐴:!'
    const { chunks } = fixtureChunks(chunksData)

    const receiver = createReceiver()

    receiver.on('message', (result) => {
      try {
        strictEqual(result, expected, 'result string is ok')
        done()
      } catch (err) {
        done(err)
      }
    })

    receiver.addChunk(chunks[2])
    receiver.addChunk(chunks[3])
    receiver.addChunk(chunks[1])
    receiver.addChunk(chunks[0])
    receiver.addChunk(chunks[4])
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

      const result = await joinChunks(chunks)

      strictEqual(result, content, 'result string is ok')
    })
  })

  it(`should send and receive uncompressed content`, async () => {
    const content = 'Some testing string'

    const chunks = await createChunks({
      content: Buffer.from(content),
      chunkSize: 4,
      compress: false
    })

    const result = await joinChunks(chunks)

    strictEqual(result, content, 'result string is ok')
  })
})

describe('data bigger than 860bytes compression', () => {
  const content = fs.readFileSync(path.join(__dirname, 'big-file.data'))

  it('should correctly chunk a big file', (done) => {
    ;(async () => {
      const chunks = await createChunks({
        content,
        chunkSize: 300
      })

      const receiver = createReceiver()

      receiver.on('message', (result) => {
        try {
          strictEqual(result, content.toString(), 'result string is ok')
          done()
        } catch (err) {
          done(err)
        }
      })

      chunks.forEach(receiver.addChunk)
    })()
  })
})
