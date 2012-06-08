// atomize-translate unittests.js unittests-compat.js atomize '$(document)' NiceException Error

function NiceException() {};
NiceException.prototype = Error.prototype;

var niceException = new NiceException();

function withAtomize (clientsAry, test) {
    var atomize = new Atomize();
    atomize.onAuthenticated = function () {
        atomize.atomically(function () {
            var key = Date();
            atomize.root[key] = atomize.lift({});
            return key;
        }, function (key) {
            var i;
            for (i = 0; i < clientsAry.length; i += 1) {
                clientsAry[i] = new Atomize();
                clientsAry[i].stm.prefix = "(c" + i + "): ";
                if (0 === i) {
                    clientsAry[i].onAuthenticated = function () {
                        test(key, clientsAry, function () {
                            for (i = 0; i < clientsAry.length; i += 1) {
                                clientsAry[i].close();
                                clientsAry[i] = undefined;
                            }
                            atomize.atomically(function () {
                                delete atomize.root[key];
                            }, function () {
                                atomize.close();
                            });
                        });
                    };
                } else {
                    (function () {
                        var j = i - 1;
                        clientsAry[i].onAuthenticated = function () {
                            clientsAry[j].connect();
                        }
                    })();
                }
            }
            clientsAry[clientsAry.length - 1].connect();
        });
    };
    atomize.connect();
}

function clients (n) {
    var ary = [];
    ary.length = n;
    return ary;
}

function contAndStart (cont) {
    cont();
    start();
}

function Semaphore (cont) {
    this.count = 0;
    this.cont = cont;
}
Semaphore.prototype = {
    fired: false,
    up: function () {
        if (this.fired) {
            throw "Semaphore Already Fired";
        }
        this.count += 1;
    },
    down: function () {
        if (this.fired) {
            throw "Semaphore Already Fired";
        }
        this.count -= 1;
        if (0 === this.count) {
            this.fired = true;
            this.cont()
        }
    }
};

$(document).ready(function(){

    asyncTest("Empty transaction", 2, function () {
        withAtomize(clients(1), function (key, clients, cont) {
            var c1 = clients[0];
            c1.atomically(function () {
                ok(true, "This txn has no read or writes so should run once");
            }, function () {
                ok(true, "The continuation should be run");
                contAndStart(cont);
            });
        });
    });

    asyncTest("Await private empty root", 1, function () {
        withAtomize(clients(1), function (key, clients, cont) {
            var c1 = clients[0];
            c1.atomically(function () {
                if (undefined === c1.root[key]) {
                    c1.retry();
                }
                return Object.keys(c1.root[key]).length;
            }, function (fieldCount) {
                strictEqual(fieldCount, 0, "Root object should be empty");
                contAndStart(cont);
            });
        });
    });

    asyncTest("Set Primitive", 1, function () {
        withAtomize(clients(1), function (key, clients, cont) {
            var c1 = clients[0],
                value = 5;
            c1.atomically(function () {
                if (undefined === c1.root[key]) {
                    c1.retry();
                } else if (undefined !== c1.root[key].field) {
                    throw "Found existing field!";
                }
                c1.root[key].field = value;
                return c1.root[key].field;
            }, function (result) {
                strictEqual(result, value, "Should have got back value");
                contAndStart(cont);
            });
        });
    });

    asyncTest("Set Empty Object", 1, function () {
        withAtomize(clients(1), function (key, clients, cont) {
            var c1 = clients[0],
                value = {};
            c1.atomically(function () {
                if (undefined === c1.root[key]) {
                    c1.retry();
                } else if (undefined !== c1.root[key].field) {
                    throw "Found existing field!";
                }
                c1.root[key].field = c1.lift(value);
                return c1.root[key].field;
            }, function (result) {
                deepEqual(result, value, "Should have got back value");
                contAndStart(cont);
            });
        });
    });

    asyncTest("Set Complex Object", 1, function () {
        withAtomize(clients(1), function (key, clients, cont) {
            var c1 = clients[0],
                value = {a: "hello", b: true, c: 5, d: {}};
            value.e = value; // add loop
            value.f = value.d; // add non-loop alias
            c1.atomically(function () {
                if (undefined === c1.root[key]) {
                    c1.retry();
                } else if (undefined !== c1.root[key].field) {
                    throw "Found existing field!";
                }
                c1.root[key].field = c1.lift(value);
                return c1.root[key].field;
            }, function (result) {
                deepEqual(result, value, "Should have got back value");
                contAndStart(cont);
            });
        });
    });

    asyncTest("Trigger (add field)", 1, function () {
        withAtomize(clients(2), function (key, clients, cont) {
            var c1 = clients[0],
                c2 = clients[1],
                trigger = "pop!";

            c1.atomically(function () {
                if (undefined === c1.root[key] ||
                    undefined === c1.root[key].trigger) {
                    c1.retry();
                }
                return c1.root[key].trigger;
            }, function (result) {
                strictEqual(trigger, result, "Should have received the trigger");
                contAndStart(cont);
            });

            c2.atomically(function () {
                if (undefined === c2.root[key]) {
                    c2.retry();
                }
                if (undefined === c2.root[key].trigger) {
                    c2.root[key].trigger = trigger;
                } else {
                    throw "Found existing trigger!";
                }
            }); // no need for a continuation here
        });
    });

    asyncTest("Trigger (add and change field)", 3, function () {
        withAtomize(clients(2), function (key, clients, cont) {
            var c1 = clients[0],
                c2 = clients[1],
                trigger1 = "pop!",
                trigger2 = "!pop";

            c1.atomically(function () {
                if (undefined === c1.root[key] ||
                    undefined === c1.root[key].trigger) {
                    c1.retry();
                }
                if (c1.root[key].trigger == trigger1) {
                    c1.root[key].trigger = trigger2;
                    return true;
                } else {
                    return false;
                }
            }, function (success) {
                ok(success, "Reached 1");
            });

            c2.atomically(function () {
                if (undefined === c2.root[key]) {
                    c2.retry();
                }
                if (undefined === c2.root[key].trigger) {
                    c2.root[key].trigger = trigger1;
                } else {
                    throw "Found existing trigger!";
                }
            }, function () {
                ok(true, "Reached 2");
                c2.atomically(function () {
                    if (trigger2 != c2.root[key].trigger) {
                        c2.retry();
                    }
                }, function () {
                    ok(true, "Reached 3");
                    contAndStart(cont);
                });
            });
        });
    });

    asyncTest("Trigger (add and remove field)", 3, function () {
        withAtomize(clients(2), function (key, clients, cont) {
            var c1 = clients[0],
                c2 = clients[1],
                trigger = "pop!";

            c1.atomically(function () {
                if (undefined === c1.root[key] ||
                    undefined === c1.root[key].trigger) {
                    c1.retry();
                }
                delete c1.root[key].trigger;
            }, function () {
                ok(true, "Reached 1");
            });

            c2.atomically(function () {
                if (undefined === c2.root[key]) {
                    c2.retry();
                }
                if (undefined === c2.root[key].trigger) {
                    c2.root[key].trigger = trigger;
                } else {
                    throw "Found existing trigger!";
                }
            }, function () {
                ok(true, "Reached 2");
                c2.atomically(function () {
                    if (undefined !== c2.root[key].trigger) {
                        c2.retry();
                    }
                }, function () {
                    ok(true, "Reached 3");
                    contAndStart(cont);
                });
            });
        });
    });

    asyncTest("Send Primitive", 1, function () {
        withAtomize(clients(2), function (key, clients, cont) {
            var c1 = clients[0],
                c2 = clients[1],
                value = 5;
            c1.atomically(function () {
                if (undefined === c1.root[key]) {
                    c1.retry();
                } else if (undefined !== c1.root[key].field) {
                    throw "Found existing field!";
                }
                c1.root[key].field = value;
            });
            c2.atomically(function () {
                if (undefined === c2.root[key] ||
                    undefined === c2.root[key].field) {
                    c2.retry();
                }
                return c2.root[key].field;
            }, function (result) {
                strictEqual(result, value, "Should have got back value");
                contAndStart(cont);
            });
        });
    });

    asyncTest("Send Empty Object", 1, function () {
        withAtomize(clients(2), function (key, clients, cont) {
            var c1 = clients[0],
                c2 = clients[1],
                value = {};
            c1.atomically(function () {
                if (undefined === c1.root[key]) {
                    c1.retry();
                } else if (undefined !== c1.root[key].field) {
                    throw "Found existing field!";
                }
                c1.root[key].field = c1.lift(value);
            });
            c2.atomically(function () {
                if (undefined === c2.root[key] ||
                    undefined === c2.root[key].field) {
                    c2.retry();
                }
                // need to ensure we read deep
                Cereal.stringify(c2.root[key].field);
                return c2.root[key].field;
            }, function (result) {
                deepEqual(result, value, "Should have got back value");
                contAndStart(cont);
            });
        });
    });

    asyncTest("Send Complex Object", 1, function () {
        withAtomize(clients(2), function (key, clients, cont) {
            var c1 = clients[0],
                c2 = clients[1],
                value = {a: "hello", b: true, c: 5, d: {}};
            value.e = value; // add loop
            value.f = value.d; // add non-loop alias
            c1.atomically(function () {
                if (undefined === c1.root[key]) {
                    c1.retry();
                } else if (undefined !== c1.root[key].field) {
                    throw "Found existing field!";
                }
                c1.root[key].field = c1.lift(value);
            });
            c2.atomically(function () {
                if (undefined === c2.root[key] ||
                    undefined === c2.root[key].field) {
                    c2.retry();
                }
                // need to ensure we read deep
                Cereal.stringify(c2.root[key].field);
                return c2.root[key].field;
            }, function (result) {
                deepEqual(result, value, "Should have got back value");
                contAndStart(cont);
            });
        });
    });

    // For some reason, the current Proxy thing suggests all
    // descriptors should be configurable. Thus we don't test for the
    // 'configurable' meta-property here. This issue should go away
    // once "direct proxies" arrive.
    asyncTest("Keys, Enumerate, etc", 10, function () {
        withAtomize(clients(2), function (key, clients, cont) {
            var c1 = clients[0],
                c2 = clients[1],
                descriptors = {a: {value: 1,
                                   writable: true,
                                   enumerable: true},
                               b: {value: 2,
                                   writable: false,
                                   enumerable: true},
                               c: {value: 3,
                                   writable: true,
                                   enumerable: false},
                               d: {value: 4,
                                   writable: false,
                                   enumerable: false}};

            c1.atomically(function () {
                if (undefined === c1.root[key]) {
                    c1.retry();
                }
                var keys = Object.keys(descriptors),
                    x, field, descriptor;
                for (x = 0; x < keys.length; x += 1) {
                    field = keys[x];
                    descriptor = descriptors[field];
                    Object.defineProperty(c1.root[key], field, descriptor);
                }
                c1.root[key].done = true;
            });
            c2.atomically(function () {
                if (undefined === c2.root[key] ||
                    undefined === c2.root[key].done) {
                    c2.retry();
                }
                delete c2.root[key].done;
                var keys = Object.keys(c2.root[key]),
                    names = Object.getOwnPropertyNames(c2.root[key]),
                    enumerable = [],
                    descriptors = {},
                    field, x;
                for (field in c2.root[key]) {
                    enumerable.push(field);
                }
                for (x = 0; x < names.length; x += 1) {
                    field = names[x];
                    descriptors[field] = Object.getOwnPropertyDescriptor(c2.root[key], field);
                    delete descriptors[field].configurable; // see comment above
                }
                return {keys: keys.sort(),
                        names: names.sort(),
                        enumerable: enumerable.sort(),
                        descriptors: descriptors,
                        hasA: 'a' in c2.root[key],
                        hasC: 'c' in c2.root[key],
                        hasZ: 'z' in c2.root[key],
                        hasOwnA: ({}).hasOwnProperty.call(c2.root[key], 'a'),
                        hasOwnC: ({}).hasOwnProperty.call(c2.root[key], 'c'),
                        hasOwnZ: ({}).hasOwnProperty.call(c2.root[key], 'z')};
            }, function (result) {
                deepEqual(result.keys, ['a', 'b'],
                          "Keys should have found enumerable fields");
                deepEqual(result.enumerable, ['a', 'b'],
                          "Enumeration should have found enumerable fields");
                deepEqual(result.names, ['a', 'b', 'c', 'd'],
                          "Should have found field names 'a' to 'd'");
                deepEqual(result.descriptors, descriptors,
                          "Should have got same descriptors back");
                ok(result.hasA, "Should have found field 'a'");
                ok(result.hasC, "Should have found field 'c'");
                ok(! result.hasZ, "Should not have found field 'z'");
                ok(result.hasOwnA, "Should have found own field 'a'");
                ok(result.hasOwnC, "Should have found own field 'c'");
                ok(! result.hasOwnZ, "Should not have found own field 'z'");
                contAndStart(cont);
            });
        });
    });

    asyncTest("Triggers: Multiple concurrent retries, multiple clients", 6, function () {
        withAtomize(clients(2), function (key, clients, cont) {
            var c1 = clients[0],
                c2 = clients[1];
            c1.atomically(function () {
                if (undefined === c1.root[key] ||
                    undefined === c1.root[key].ready) {
                    c1.retry();
                }
                c1.root[key].ready = ! c1.root[key].ready; // 2. Flip it false to true
            }, function () {
                ok(true, "Reached 1");
            });
            // We do the 'gone' thing because otherwise c1's txns can
            // create and remove it, before c2 spots its
            // existence. I.e. classic race condition.
            c1.atomically(function () {
                if (undefined === c1.root[key] ||
                    undefined === c1.root[key].ready ||
                    ! c1.root[key].ready) {
                    c1.retry();
                }
                delete c1.root[key].ready; // 3. Delete it
                c1.root[key].gone = true;
            }, function () {
                ok(true, "Reached 2");
            });
            c2.atomically(function () {
                if (undefined === c2.root[key] ||
                    (undefined === c2.root[key].ready &&
                     undefined === c2.root[key].gone)) {
                    c2.retry(); // A. Await its existence
                }
            }, function () {
                ok(true, "Reached 3");
                c2.atomically(function () {
                    if (Object.hasOwnProperty.call(c2.root[key], 'ready')) {
                        c2.retry(); // B. Await its disappearance
                    }
                    ok(c2.root[key].gone, "If 'ready' has gone, 'gone' must be truth");
                    delete c2.root[key].gone;
                }, function () {
                    ok(true, "Reached 4");
                    contAndStart(cont); // C. All done
                });
            });
            c2.atomically(function () {
                if (undefined === c2.root[key]) {
                    c2.retry();
                }
                c2.root[key].ready = false; // 1. Create it as false
            }, function () {
                ok(true, "Reached 5");
            });
        });
    });

    asyncTest("OrElse", 4, function () {
        withAtomize(clients(2), function (key, clients, cont) {
            var c1 = clients[0],
                c2 = clients[1],
                fun;
            fun = function (sum) {
                ok(true, "Reached 1"); // should reach this 4 times
                if (10 === sum) { // 10 === 1+2+3+4
                    contAndStart(cont);
                    return;
                }
                c1.orElse(
                    [function () {
                        if (undefined === c1.root[key] ||
                            undefined === c1.root[key].a) {
                            c1.retry();
                        }
                        c1.root[key].b = c1.root[key].a + 2;
                        delete c1.root[key].a;
                        return c1.root[key].b;
                    }, function () {
                        if (undefined === c1.root[key] ||
                            undefined === c1.root[key].b) {
                            c1.retry();
                        }
                        c1.root[key].c = c1.root[key].b + 3;
                        delete c1.root[key].b;
                        return c1.root[key].c;
                    }, function () {
                        if (undefined === c1.root[key] ||
                            undefined === c1.root[key].c) {
                            c1.retry();
                        }
                        c1.root[key].d = c1.root[key].c + 4;
                        delete c1.root[key].c;
                        return c1.root[key].d;
                    }], fun);
            };
            fun(0);
            c2.atomically(function () {
                if (undefined === c2.root[key]) {
                    c2.retry();
                }
                c2.root[key].a = 1;
            });
        });
    });

    asyncTest("OrElse - observing order", 4, function () {
        // Same as before, but drop the deletes, and invert the order
        // of the orElse statements. As its deterministic choice,
        // should do the same as before.
        withAtomize(clients(2), function (key, clients, cont) {
            var c1 = clients[0],
                c2 = clients[1],
                fun;
            fun = function (sum) {
                ok(true, "Reached 1"); // should reach this 4 times
                if (10 === sum) { // 10 === 1+2+3+4
                    contAndStart(cont);
                    return;
                }
                c1.orElse(
                    [function () {
                        if (undefined === c1.root[key] ||
                            undefined === c1.root[key].c) {
                            c1.retry();
                        }
                        c1.root[key].d = c1.root[key].c + 4;
                        return c1.root[key].d;
                    }, function () {
                        if (undefined === c1.root[key] ||
                            undefined === c1.root[key].b) {
                            c1.retry();
                        }
                        c1.root[key].c = c1.root[key].b + 3;
                        return c1.root[key].c;
                    }, function () {
                        if (undefined === c1.root[key] ||
                            undefined === c1.root[key].a) {
                            c1.retry();
                        }
                        c1.root[key].b = c1.root[key].a + 2;
                        return c1.root[key].b;
                    }], fun);
            };
            fun(0);
            c2.atomically(function () {
                if (undefined === c2.root[key]) {
                    c2.retry();
                }
                c2.root[key].a = 1;
            });
        });
    });

    (function () {
        var clientCount = 6,
            clientConcurrency = 10,
            txnCount = 10;

        asyncTest("Rampaging Transactions 1 (this takes a while)",
                  ((clientCount - 1) * clientConcurrency * txnCount) -1, function () {
                      withAtomize(clients(clientCount), function (key, clients, cont) {
                          var semaphore = new Semaphore(function () { contAndStart(cont); }),
                              fun, x, y;
                          fun = function (c) {
                              c.atomically(function () {
                                  if (undefined === c.root[key] ||
                                      undefined === c.root[key].obj) {
                                      c.retry();
                                  }
                                  var keys = Object.keys(c.root[key].obj),
                                      max = 0,
                                      x, field, n, obj;
                                  for (x = 0; x < keys.length; x += 1) {
                                      field = parseInt(keys[x]);
                                      max = field > max ? field : max;
                                      if (undefined === n) {
                                          n = c.root[key].obj[field].num;
                                          if (0 === n) {
                                              return n;
                                          }
                                      } else if (n !== c.root[key].obj[field].num) {
                                          throw ("All fields should have the same number: " +
                                                 n + " vs " + c.root[key].obj[field].num);
                                      }
                                      if (0.75 < Math.random()) {
                                          obj = c.lift({});
                                          obj.num = n;
                                          c.root[key].obj[field] = obj;
                                      }
                                      c.root[key].obj[field].num -= 1;
                                  }
                                  n -= 1;
                                  max += 1;
                                  if (0.75 < Math.random()) {
                                      c.root[key].obj[max] = c.lift({num: n});
                                      delete c.root[key].obj[keys[0]];
                                  }
                                  return n;
                              }, function (n) {
                                  if (n > 0) {
                                      ok(true, "Reached");
                                      fun(c);
                                  } else {
                                      semaphore.down();
                                  }
                              });
                          };
                          // We use all but one client, and each of those gets 10
                          // txns concurrently
                          for (x = 1; x < clients.length; x += 1) {
                              for (y = 0; y < clientConcurrency; y += 1) {
                                  semaphore.up();
                                  fun(clients[x]);
                              }
                          }
                          x = clients[0];
                          x.atomically(function () {
                              if (undefined === x.root[key]) {
                                  x.retry();
                              }
                              var obj = x.lift({});
                              for (y = 0; y < 5; y += 1) {
                                  obj[y] = x.lift({num: (clientCount - 1) * clientConcurrency * txnCount});
                              }
                              x.root[key].obj = obj;
                          });
                      });
                  });
    }());

    (function () {
        var clientCount = 6,
            clientConcurrency = 6,
            txnCount = 10;

        asyncTest("Rampaging Transactions 2 (this takes a while)",
                  (clientCount - 1) * clientConcurrency * txnCount, function () {
                      withAtomize(clients(clientCount), function (key, clients, cont) {
                          var semaphore = new Semaphore(function () { contAndStart(cont); }),
                              fun;
                          fun = function (c, n) {
                              c.atomically(function () {
                                  if (undefined === c.root[key] ||
                                      undefined === c.root[key].obj) {
                                      c.retry();
                                  }
                                  var ops, names, secret, x, name, op;

                                  // First verify the old thing
                                  ops = c.root[key].obj.log;
                                  if (undefined !== ops) {
                                      secret = ops.secret;
                                      names = Object.keys(ops);
                                      for (x = 0; x < names.length; x += 1) {
                                          name = names[x];
                                          if ('secret' === name) {
                                              continue;
                                          } else if ('delete' === ops[name]) {
                                              if (({}).hasOwnProperty.call(c.root[key].obj, name)) {
                                                  throw ("Found field which should be deleted: " + name)
                                              }
                                          } else if ('modify' === ops[name]) {
                                              if (! ({}).hasOwnProperty.call(c.root[key].obj, name)) {
                                                  throw ("Failed to find field: " + name);
                                              }
                                              if (secret !== c.root[key].obj[name].modified.value) {
                                                  throw ("Found the wrong modified value in field: " + name);
                                              }
                                          } else if ('create' === ops[name]) {
                                              if (! ({}).hasOwnProperty.call(c.root[key].obj, name)) {
                                                  throw ("Failed to find field: " + name);
                                              }
                                              if (secret !== c.root[key].obj[name].created.value) {
                                                  throw ("Found the wrong created value in field: " + name);
                                              }
                                          } else {
                                              throw ("Found unknown op: " + ops[name]);
                                          }
                                      }
                                  }

                                  secret = Math.random();
                                  ops = {secret: secret};
                                  for (x = 0; x < 20; x += 1) {
                                      name = Math.round(Math.random() * 50);
                                      op = Math.random();
                                      if (op > 0.9) {
                                          delete c.root[key].obj[name];
                                          ops[name] = 'delete';
                                      } else if (op > 0.1 && ({}).hasOwnProperty.call(c.root[key].obj, name)) {
                                          c.root[key].obj[name].modified.value = secret;
                                          ops[name] = 'modify';
                                      } else {
                                          c.root[key].obj[name] = c.lift({});
                                          c.root[key].obj[name].created = c.lift({value: secret});
                                          c.root[key].obj[name].modified = c.lift({value: secret});
                                          ops[name] = 'create';
                                      }
                                  }
                                  c.root[key].obj.log = c.lift(ops);
                              }, function () {
                                  ok(true, "Reached");
                                  n += 1;
                                  if (10 === n) {
                                      semaphore.down();
                                  } else {
                                      fun(c, n);
                                  }
                              });
                          };
                          // We use all but one client, and each of those gets 10
                          // txns concurrently
                          for (x = 1; x < clients.length; x += 1) {
                              for (y = 0; y < clientConcurrency; y += 1) {
                                  semaphore.up();
                                  fun(clients[x], 0);
                              }
                          }
                          x = clients[0];
                          x.atomically(function () {
                              if (undefined === x.root[key]) {
                                  x.retry();
                              }
                              x.root[key].obj = x.lift({});
                          });
                      });
                  });
    }());

});
