var wss = require('websocket-stream')
var http = require('http')
var eos = require('end-of-stream')
var events = require('events')

module.exports = localcast

function localcast (name) {
  if (!name) name = 'localcast'

  var server = http.createServer()
  var port = 46356
  var cast = new events.EventEmitter()
  var emit = events.EventEmitter.prototype.emit
  var closing = false

  var queue = []
  var streams = null
  var isLeader = false

  cast.emit = function () {
    queue.push(Array.prototype.slice.call(arguments))
    drain()
    return emit.apply(this, arguments)
  }

  cast.close = function () {
    closing = true
    cast.removeAllListeners()
    server.close()
    if (streams) {
      for (var i = 0; < streams.length; i++) {
        streams[i].end()
      }
    }
  }

  server.on('listening', onleader)
  update()

  return cast

  function drain () {
    if (!streams) return

    while (queue.length) {
      var next = queue.shift()
      if (!next) return

      for (var i = 0; i < streams.length; i++) {
        if (isLeader && streams[i].handshake && streams[i].handshake.namespace !== name) continue
        streams[i].write(JSON.stringify(next))
      }
    }
  }

  function onfollower (stream) {
    stream.write(JSON.stringify({type: 'node', namespace: name, pid: process.pid}))
    stream.on('data', function (data) {
      emit.apply(cast, JSON.parse(data))
    })

    streams = [stream]
    drain()
  }

  function onleader () {
    isLeader = true
    streams = []
    wss.createServer({server: server}, onsocket)

    function onsocket (stream) {
      stream.once('data', function (handshake) {
        stream.handshake = JSON.parse(handshake)

        if (stream.handshake.namespace === name) {
          stream.write(JSON.stringify(['localcast', {type: 'node', namespace: name, pid: process.pid}]))
          emit.call(cast, 'localcast', stream.handshake)
        }

        for (var i = 0; i < streams.length; i++) {
          if (forward(streams[i], stream)) {
            streams[i].write(JSON.stringify(['localcast', stream.handshake]))
            stream.write(JSON.stringify(['localcast', streams[i].handshake]))
          }
        }

        stream.on('data', function (data) {
          var args = JSON.parse(data)
          if (stream.handshake.namespace === name) emit.apply(cast, args)

          for (var i = 0; i < streams.length; i++) {
            if (forward(streams[i], stream)) {
              streams[i].write(data)
            }
          }
        })
      })

      streams.push(stream)
      eos(stream, function () {
        streams.splice(streams.indexOf(stream), 1)
      })
    }
  }

  function update () {
    if (closing) return
    streams = null
    tryListen(function (err) {
      if (err) tryConnect()
    })
  }

  function forward (a, b) {
    return a !== b && a.handshake && b.handshake && a.handshake.namespace === b.handshake.namespace
  }

  function tryConnect () {
    var stream = wss('ws://localhost:' + port)
    onfollower(stream)
    stream.resume()
    eos(stream, update)
  }

  function tryListen (cb) {
    server.on('listening', done)
    server.on('error', done)
    server.listen(port, '127.0.0.1')

    function done (err) {
      server.removeListener('error', done)
      server.removeListener('listening', done)
      cb(err)
    }
  }
}
