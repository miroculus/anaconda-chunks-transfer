const { promisify } = require('util')
const zlib = require('zlib')

// https://webmasters.stackexchange.com/questions/31750/what-is-recommended-minimum-object-size-for-gzip-performance-benefits
const MINIMUM_SIZE = 860

const gzip = promisify(zlib.gzip)
const gunzip = promisify(zlib.gunzip)

const isGzip = (buff) => {
  if (!Buffer.isBuffer(buff) || buff.length < 3) return false
  return buff[0] === 0x1F && buff[1] === 0x8B && buff[2] === 0x08
}

module.exports.compress = async (buff) => {
  if (Buffer.byteLength(buff) < MINIMUM_SIZE) return buff
  return gzip(buff)
}

module.exports.decompress = async (buff) => {
  if (!isGzip(buff)) return buff
  return gunzip(buff)
}
