var localcast = require('./')
var cast = localcast()

cast.on('localcast', function (node) {
  console.log(node)
})

cast.on('hello', function (data) {
  console.log(data)
})

var id = Math.random()
console.log('my-id', id)

setInterval(function () {
  cast.emit('hello', 'world ' + id)
}, 1000)
