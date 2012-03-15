# Atomize-examples

This repository contains some tests and some examples of using
AtomizeJS.

All of these examples require an AtomizeJS server running on
`localhost`. The simplest way to achieve that is to `npm install
atomize-server` and run then `node --harmony-collections
--harmony-proxies app.js` where `app.js` is found in this repository.
Note that by default, it is expected the AtomizeJS server is listening
on `localhost` port `9999`.

Please see the main [AtomizeJS site](http://atomizejs.github.com/) for
further details.

* test/
    * unittests.html
        * Unit tests for the AtomizeJS client and server.
    * retry.html
        * Demonstrates using the `retry` functionality to wait for
          another client to join before setting a value. Watch the
          browser JavaScript console.
    * onewriter.html
        * Demonstrates many clients writing to the same variable
          safely.
    * queue.html
        * Demonstrates a broadcast queue: only one writer, but
          multiple readers, and every reader gets all messages added
          to the queue after the reader has joined.
* bomberman/
    * index.html
        * An implementation of the classic game
          [Bomberman](http://en.wikipedia.org/wiki/Bomberman). The
          entire multiplayer game is written in client-side JavaScript
          using just the AtomizeJS features to safely modify the game
          board.
