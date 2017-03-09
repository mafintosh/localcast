var localcast = require('./')
var cast = localcast('foo')

cast.on('hello', function () {
  console.log('sup')
})

setInterval(function () {
  cast.emit('hello', 'world')
}, 1000)
