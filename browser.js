var wss = require('websocket-stream')
var eos = require('end-of-stream')
var events = require('events')

module.exports = localcast

function localcast (name) {
  if (!name) name = 'localcast'

  var socket = null
  var port = 46356
  var cast = new events.EventEmitter()
  var emit = cast.emit

  var queue = []
  var onceConnected = false

  cast.emit = function () {
    queue.push(Array.prototype.slice.call(arguments))
    drain()
    return emit.apply(cast, arguments)
  }

  tryConnect()

  return cast

  function drain () {
    if (!socket) {
      if (onceConnected) queue = []
      return
    }

    while (queue.length) socket.write(JSON.stringify({name: name, args: queue.shift()}))
  }

  function tryConnect () {
    var s = wss('ws://localhost:' + port)

    s.write(JSON.stringify({type: 'browser', location: window.location.toString()}))

    s.on('connect', function (data) {
      onceConnected = true
      socket = s
      drain()
    })

    s.on('data', function (data) {
      data = JSON.parse(data.toString())
      if (data.name === name) emit.apply(cast, data.args)
    })

    eos(s, function () {
      socket = null
      setTimeout(tryConnect, 1000)
    })
  }
}
