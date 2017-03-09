var localcast = require('./')
var cast = localcast()

cast.on('hello', function (data) {
  console.log(data)
})

var id = Math.random()

setInterval(function () {
  cast.emit('hello', 'world ' + id)
}, 1000)
