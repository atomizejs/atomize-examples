# Atomize-examples

This repository contains some tests and some examples of using
AtomizeJS.

The simplest way to get these up and running is:

    git clone https://github.com/atomizejs/atomize-examples.git
    npm install ./atomize-examples
    sh $(npm bin)/atomize-examples-server

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
