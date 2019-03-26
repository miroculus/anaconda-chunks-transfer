const createHash = require('./src/create-hash')
const splitBuffer = require('./src/split-buffer')
const flatten = require('./src/flatten')

/**
 * @typedef {object} Chunk
 * @property {string} id Id of the entire data this chunk is part of.
 * @property {number} total Total amounts of chunks for the entire data.
 * @property {number} index Number of this chunk for the entire data.
 * @property {array} data Stringified array using JSON.stringfy of the buffer part for this chunk.
 */

/**
 * Create a ChunksTransfer object from a String or a Buffer
 * @param {object} options
 * @param {Buffer} options.content Content that needs to be chunked.
 * @param {number} options.chunkSize Maximum size in bytes for each chunk.
 * @returns {Chunk[]} An array containing all the chunks objects.
 */
module.exports.createChunks = ({ content, chunkSize }) => {
  if (!Buffer.isBuffer(content)) {
    throw new Error('options.content must be a buffer')
  }

  const id = createHash(content)
  const chunks = splitBuffer(content, chunkSize)
  const total = chunks.length

  return chunks.map((data, index) => ({
    id,
    total,
    index,
    data: Array.from(data)
  }))
}

/**
 * Create a ChunksReader object from a String or a Buffer
 * @param {string} id ChunksTransfer id of the object you are going to receive.
 */
module.exports.createReceiver = ({ id, total }) => {
  const chunks = []
  let received = 0
  let buff

  if (!Number.isSafeInteger(total) || total <= 0) {
    throw new Error('Invalid total value')
  }

  const receiver = {
    /** @member {boolean} If the content was completely received */
    done: () => received >= total,

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
     * @returns {Buffer} the entire content as buffer.
     */
    toBuffer () {
      if (!receiver.done()) throw new Error('Missing chunks to convert to buffer')
      if (buff) return buff

      const values = chunks.reduce((vals, data) => {
        vals.push(...data)
        return vals
      }, [])

      return Buffer.from(values)
    },

    /**
     * @returns {string} the entire content as string.
     */
    toString () {
      return receiver.toBuffer().toString()
    },

    /**
     * Verify if the content result correspond to the given id
     * @returns {boolean} the entire content as string.
     */
    verify () {
      return id === createHash(receiver.toBuffer())
    }
  }

  return receiver
}
