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
  var isClosing = false

  var queue = []
  var onceConnected = false

  cast.emit = function () {
    queue.push(Array.prototype.slice.call(arguments))
    drain()
    return emit.apply(cast, arguments)
  }

  cast.close = function () {
    isClosing = true
    socket.end()
  }

  tryConnect()

  return cast

  function drain () {
    if (!socket) {
      if (onceConnected) queue = []
      return
    }

    while (queue.length) socket.write(JSON.stringify(queue.shift()))
  }

  function tryConnect () {
    var s = wss('ws://localhost:' + port)

    s.write(JSON.stringify({type: 'browser', namespace: name, location: window.location.toString()}))

    s.on('connect', function (data) {
      onceConnected = true
      socket = s
      drain()
    })

    s.on('data', function (data) {
      data = JSON.parse(data.toString())
      emit.apply(cast, data)
    })

    eos(s, function () {
      socket = null
      if (isClosing) return
      setTimeout(tryConnect, 1000)
    })
  }
}
