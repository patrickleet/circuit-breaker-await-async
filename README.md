[![Build Status](https://travis-ci.org/patrickleet/circuit-breaker-await-async.svg?branch=master)](https://travis-ci.org/patrickleet/circuit-breaker-await-async)
[![codecov](https://codecov.io/gh/patrickleet/circuit-breaker-await-async/branch/master/graph/badge.svg)](https://codecov.io/gh/patrickleet/circuit-breaker-await-async)

# circuit-breaker-await-async

[![Greenkeeper badge](https://badges.greenkeeper.io/patrickleet/circuit-breaker-await-async.svg)](https://greenkeeper.io/)
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
