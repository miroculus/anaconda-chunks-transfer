# Chunks Transfer

This utility prepares a given buffer to be transfered in chunks, probably through
the network. Useful when you want to transfer large files using a custom protocol.

## Usage

You will need to use the library on a server and a client. On the server you will
generate the chunks with the metadata and then send them one by one to the client.

> In this example we will be using the functions `publishToClient` and `onMessageFromServer`
> which should be your custom transfer methods.

e.g.:

**server.js**
```javascript
const { createChunks } = require('@miroculus/anaconda-chunks-transfer')

const content = 'superbigstring....'

const chunks = createChunks({
  content: Buffer.from(content), // Complete buffer you want to transfer
  chunkSize: 12 // maximum amount of bytes of data a chunk should contain
})

chunks.forEach((chunk) => {
  publishToClient(chunk)
})
```

```javascript
const { createReceiver } = require('@miroculus/anaconda-chunks-transfer')

let receiver = null

onMessageFromServer((chunk) => {
  if (!receiver) {
    const { id, total } = chunk
    receiver = createReceiver({ id, total })
  }

  receiver.addChunk(chunk)

  // The message has been completely received
  if (receiver.done()) {
    console.log(receiver.toString())
  }
})
```
