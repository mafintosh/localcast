# localcast

A shared event emitter that works across multiple processes on the same machine, including the browser!

```
npm install localcast
```

## Usage

First save the example below in file called `example.js`.

``` js
var localcast = require('localcast')
var cast = localcast()

cast.on('hello', function (data) {
  console.log('hello', data)
})

cast.emit('hello', 'world')
```

Then try running the example in a terminal.

``` sh
# in one terminal
$ node example.js
```

Running the above should print out `hello world` and keep the process running.

Then try running opening a new terminal and run the example again.

``` sh
# in a new terminal
$ node example.js
```

Both the new and old terminal should print out `hello world`.

Now try browserifying the example

``` sh
browserify example.js > bundle.js
echo '<html><body><script src="bundle.js"></script></body></html>' > example.html
```

Open `example.html` in a browser. Now both the browser and the two previous terminals should print out `hello world`!

## API

#### `var cast = localcast([name])`

Create a new localcast event emitter.

Optionally you can give it a name if you are running multiple and want them to avoid clashing.

## License

MIT
