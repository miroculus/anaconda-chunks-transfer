/**
 * Split the given buffer on chunks that have a maximum size of maxBytes.
*/
module.exports = (data, maxBytes) => {
  if (!Buffer.isBuffer(data)) throw new Error('Data must be a buffer')
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new Error('Invalid maxBytes value')
  }

  const byteTotal = Buffer.byteLength(data)

  if (byteTotal <= maxBytes) return [data]

  const count = Math.ceil(byteTotal / maxBytes)
  const out = []

  for (let i = 0; i < count; i++) {
    const start = i * maxBytes
    out.push(data.slice(start, Math.min(start + maxBytes, data.length)))
  }

  return out
}
