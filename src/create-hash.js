const crypto = require('crypto')

/**
 * Create a unique hash using sha1 for the given buffer
 * @param {Buffer} data
 * @returns {string}
 */
module.exports = (data) => crypto
  .createHash('sha1')
  .update(data)
  .digest('hex')
