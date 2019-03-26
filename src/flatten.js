module.exports = (arr) => arr.reduce((result, curr) => {
  result.push(...curr)
  return result
}, [])
