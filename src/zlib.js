const { promisify } = require('util')
const zlib = require('zlib')

// https://webmasters.stackexchange.com/questions/31750/what-is-recommended-minimum-object-size-for-gzip-performance-benefits
const MINIMUM_SIZE = 860

const gzip = promisify(zlib.gzip)
const gunzip = promisify(zlib.gunzip)

/**
 * @param {Buffer} buffer
 * @returns {boolean}
 */
const isGzip = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 3) return false
  return buffer[0] === 0x1F && buffer[1] === 0x8B && buffer[2] === 0x08
}

exports.isGzip = isGzip

/**
 * Compress the given buffer using gzip, but only if its convenient.
 * @param {Buffer} buffer
 * @returns {Promise<Buffer>}
 */
exports.compress = async (buffer) => {
  if (Buffer.byteLength(buffer) < MINIMUM_SIZE) return buffer
  return gzip(buffer)
}

/**
 * Decompress the given buffer if its gzipped, if not return it.
 * @param {Buffer} buffer
 * @returns {Promise<Buffer>}
 */
exports.decompress = async (buffer) => {
  if (!isGzip(buffer)) return buffer
  return gunzip(buffer)
}
