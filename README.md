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
