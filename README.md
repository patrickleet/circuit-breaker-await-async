# circuit-breaker-await-async

[![Release](https://github.com/patrickleet/circuit-breaker-await-async/actions/workflows/release.yml/badge.svg)](https://github.com/patrickleet/circuit-breaker-await-async/actions/workflows/release.yml)
[![codecov](https://codecov.io/gh/patrickleet/circuit-breaker-await-async/branch/master/graph/badge.svg)](https://codecov.io/gh/patrickleet/circuit-breaker-await-async)


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

Works with any `fn` that returns a promise
