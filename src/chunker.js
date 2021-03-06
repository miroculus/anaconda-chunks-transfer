/**
 * Split the given string on chunks of a maximum amount of bytes each
 * @param {Buffer} buffer to divide in chunks
 * @param {number} maxBytesPerChunk maximum size in bytes a chunk can have
 * @returns {string[]} serialized string of the buffer
 */
exports.split = function split (buffer, maxBytesPerChunk) {
  if (!Buffer.isBuffer(buffer)) throw new Error('Given data must be a buffer')

  const str = buffer.toString('base64')

  if (
    !Number.isSafeInteger(maxBytesPerChunk) ||
    maxBytesPerChunk < 4 ||
    maxBytesPerChunk % 2 !== 0
  ) {
    throw new Error('bytesPerChunk param must be at least 4 and even')
  }

  if (str.length === 0) return [str]

  const chunks = ['']

  for (let v of str) {
    let chunk = chunks[chunks.length - 1]

    // Create a new chunk if necessary
    if (Buffer.byteLength(chunk) + Buffer.byteLength(v) > maxBytesPerChunk) {
      chunk = ''
      chunks.push(chunk)
    }

    chunk += v

    chunks[chunks.length - 1] = chunk
  }

  return chunks
}

/**
 * Join splitted string
 * @param {string[]} chunks to be joined together (previously splitted with splitString)
 * @returns {Buffer}
 */
exports.join = function join (chunks) {
  if (!Array.isArray(chunks)) throw new Error('Given data must be an array')
  return Buffer.from(chunks.join(''), 'base64')
}
