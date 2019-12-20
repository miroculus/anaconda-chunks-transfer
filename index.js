const EventEmitter = require('events')
const createHash = require('./src/create-hash')
const chunker = require('./src/chunker')
const zlib = require('./src/zlib')

/**
 * @typedef {object} Chunk
 * @property {string} id Id of the entire data this chunk is part of.
 * @property {number} total Total amounts of chunks for the entire data.
 * @property {number} index Number of this chunk for the entire data.
 * @property {string} data Stringified array using JSON.stringfy of the buffer part for this chunk.
 */

/**
 * Create an array of Chunk objects from from the given String or Buffer
 * @param {object} options
 * @param {Buffer} options.content Content that needs to be chunked.
 * @param {number} options.chunkSize Maximum size in bytes for each chunk.
 * @param {boolean} [options.compress=true] If the content should be compressed using gzip
 * @returns {Promise<Chunk[]>} An array containing all the chunks objects.
 */
exports.createChunks = async ({
  content,
  chunkSize,
  compress = true
}) => {
  if (!Buffer.isBuffer(content)) {
    throw new Error('options.content must be a buffer')
  }

  const id = createHash(content)
  const compressed = compress
    ? await zlib.compress(content)
    : content
  const chunks = chunker.split(compressed, chunkSize)
  const total = chunks.length

  const result = chunks.map((data, index) => ({
    id,
    total,
    index,
    data
  }))

  return result
}

/**
 * Joins the given array of Chunk objects into a string.
 * @param {Chunk[]} chunks array of chnks generated using the createChunks fn
 * @returns {Promise<string>}
 */
exports.joinChunks = async (chunks) => {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    throw new Error('Invalid chunks param')
  }

  const compressed = chunker.join(chunks.map((chunk) => chunk.data))
  const buff = await zlib.decompress(compressed)

  return buff.toString()
}

/**
 * @typedef {object} ChunksReceiver
 * @property {function} addChunk
 */

/**
 * Create a ChunksReader object from a String or a Buffer
 * @param {object} [options]
 * @param {number} [options.timeout=60000] Milliseconds before emitting a TIMEOUT error
 * @returns {EventEmitter & ChunksReceiver}
 */
exports.createReceiver = ({ timeout = 60000 } = {}) => {
  const receivers = new Map()

  const chunksReceiver = new EventEmitter()

  /**
   * @param {Chunk} chunk Received item chunk to add to the final data.
   */
  chunksReceiver.addChunk = async (chunk) => {
    if (!chunk) throw new Error('Missing chunk to add')

    const { id, total } = chunk

    if (!receivers.has(id)) {
      const receiver = {
        total,
        received: 0,
        chunks: [],
        timeoutId: setTimeout(() => {
          receivers.delete(id)

          const err = new Error(`Timeout when receiving chunks "${id}"`)
          chunksReceiver.emit('error', err)
        }, timeout)
      }

      receivers.set(id, receiver)
    }

    const receiver = receivers.get(id)

    if (receiver.total <= receiver.received) {
      throw new Error('All chunks already received')
    }

    if (!Number.isSafeInteger(chunk.index) || chunk.index < 0 || chunk.index >= total) {
      throw new Error('Invalid chunk.index value')
    }

    receiver.chunks[chunk.index] = chunk

    receiver.received++

    // The message has been completely received
    if (receiver.total === receiver.received) {
      clearTimeout(receiver.timeoutId)
      receivers.delete(id)

      try {
        const result = await exports.joinChunks(receiver.chunks)
        chunksReceiver.emit('message', result)
      } catch (err) {
        chunksReceiver.emit('error', err)
      }
    }
  }

  return chunksReceiver
}
