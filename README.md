[![Build Status](https://travis-ci.org/patrickleet/circuit-breaker-await-async.svg?branch=master)](https://travis-ci.org/patrickleet/circuit-breaker-await-async)

# circuit-breaker-await-async
ES6 circuit breaker built around await/async patterns

Usage:

```
let circuitBreaker = new CircuitBreaker(fn)

try {
  let result = await circuitBreaker.call()
} catch (e) {
  // ...
}
```
