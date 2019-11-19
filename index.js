const createHash = require('./src/create-hash')
const { splitString, joinString } = require('./src/str')
const zlib = require('./src/zlib')

/**
 * @typedef {object} Chunk
 * @property {string} id Id of the entire data this chunk is part of.
 * @property {number} total Total amounts of chunks for the entire data.
 * @property {number} index Number of this chunk for the entire data.
 * @property {string} data Stringified array using JSON.stringfy of the buffer part for this chunk.
 */

/**
 * Create a ChunksTransfer object from a String or a Buffer
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
  const chunks = splitString(compressed.toString(), chunkSize)
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
 * Create a ChunksReader object from a String or a Buffer
 * @param {object} chunk
 * @param {string} chunk.id ChunksTransfer id of the object you are going to receive.
 * @param {number} chunk.total Total needed chunks to complete the object
 */
exports.createReceiver = ({ id, total }) => {
  const chunks = []
  let received = 0
  let buff

  if (!Number.isSafeInteger(total) || total <= 0) {
    throw new Error('Invalid total value')
  }

  const receiver = {
    /**
     * Returns true if the content was completely received
     * @returns {boolean}
     */
    done () {
      return received === total
    },

    /**
     * @param {Chunk} chunk Received item chunk to add to the final data.
     */
    addChunk (chunk) {
      if (receiver.done()) throw new Error('All chunks already received')
      if (!chunk) throw new Error('Missing chunk to add')
      if (chunk.id !== id) throw new Error(`Invalid id ${chunk.id} given on chunk receiver with id ${id}`)

      if (!Number.isSafeInteger(chunk.index) || chunk.index < 0 || chunk.index >= total) {
        throw new Error('Invalid chunk.index value')
      }

      chunks[chunk.index] = chunk.data

      received++

      return receiver
    },

    /**
     * If the receiver has all the pieces, it will unite them and decompress it.
     * @returns {Promise<Buffer>} the entire content as buffer.
     */
    async toBuffer () {
      if (!receiver.done()) throw new Error('Missing chunks to convert to buffer')
      if (buff) return buff
      const compressed = joinString(chunks)
      buff = await zlib.decompress(Buffer.from(compressed))
      return buff
    },

    /**
     * Returns the complete buffer as string
     * @returns {Promise<string>}
     */
    async toString () {
      const buff = await receiver.toBuffer()
      return buff.toString()
    },

    /**
     * Verify if the content result correspond to the given id
     * @returns {Promise<boolean>}
     */
    async verify () {
      const buff = await receiver.toBuffer()
      return id === createHash(buff)
    }
  }

  return receiver
}
