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

  var queue = []
  var streams = null

  cast.emit = function () {
    queue.push(Array.prototype.slice.call(arguments))
    drain()
    return emit.apply(this, arguments)
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
        streams[i].write(JSON.stringify({name: name, args: next}))
      }
    }
  }

  function onfollower (stream) {
    stream.once('data', function (data) {
      var remote = JSON.parse(data)

      if (remote !== name) {
        var err = new Error('Another localcast is running here: ' + remote + '. Pick another name')
        emit.call(cast, 'error', err)
        return
      }

      stream.on('data', function (data) {
        data = JSON.parse(data)
        if (data.name === name) emit.apply(cast, data.args)
      })
    })

    streams = [stream]
    drain()
  }

  function onleader () {
    streams = []
    wss.createServer({server: server}, onsocket)

    function onsocket (stream) {
      stream.write(JSON.stringify(name))
      stream.on('data', function (data) {
        var parsed = JSON.parse(data)
        if (parsed.name === name) emit.apply(cast, parsed.args)
        for (var i = 0; i < streams.length; i++) {
          if (streams[i] !== stream) streams[i].write(data)
        }
      })
      streams.push(stream)
      eos(stream, function () {
        streams.splice(streams.indexOf(stream), 1)
      })
    }
  }

  function update () {
    streams = null
    tryListen(function (err) {
      if (err) tryConnect()
    })
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
