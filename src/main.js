import debug from 'debug'
import EventEmitter from 'events'

const log = debug('circuit-breaker-await-async')

export const states = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
}

export const errors = {
  CIRCUIT_IS_OPEN: 'CIRCUIT_IS_OPEN'
}

export class CircuitBreaker extends EventEmitter {
  constructor(fn, {
    state = states.CLOSED,
    maxFailures = 10,
    callTimeoutMs = 1 * 1000,
    resetTimeoutMs = 10 * 1000
  } = {}) {
    if (!fn) {
      throw new Error('fn is required')
    }

    super()

    this.fn = fn
    this.maxFailures = maxFailures
    this.callTimeoutMs = callTimeoutMs
    this.resetTimeoutMs = resetTimeoutMs

    this.state = state

    this.currentAttempt = 0
    this.resetAttempt = 0

    this.on('circuit-breaker.call', async () => {
      log('circuit-breaker.call received')
      if (this.currentAttempt < this.maxFailures) {
        try {
          this.currentAttempt++
          log(`Attempt ${this.currentAttempt} Started`)
          let result = await this.fn()
          this.emit('circuit-breaker.call.succeeded', result)
        } catch (e) {
          log(`Attempt ${this.currentAttempt} Failed`)
          // attempt again in callTimeoutMs
          setTimeout(() => {
            this.emit('circuit-breaker.call')
          }, this.callTimeoutMs)
        }
      } else {
        log('Calls to your function have failed 10 times in a row. Tripping the circuit to prevent more incoming requests.')
        this.emit('circuit-breaker.trip')

        this.emit('circuit-breaker.call.failed', new Error(errors.CIRCUIT_IS_OPEN))

        // in resetTimeoutMs, attempt resetting the circuit
        setTimeout(() => {
          this.emit('circuit-breaker.attempt-reset')
        }, this.resetTimeoutMs)
      }
    })

    this.on('circuit-breaker.call.succeeded', () => {
      this.state = states.CLOSED
      this.currentAttempt = 0
    })

    this.on('circuit-breaker.trip', async () => {
      log('tripping circuitbreaker')
      this.state = states.OPEN
    })

    this.on('circuit-breaker.attempt-reset', async () => {
      log('attempting to reset circuit breaker')
      this.state = states.HALF_OPEN
      this.currentAttempt = 0
    })
  }

  call() {
    const doCall = () => {
      return new Promise((resolve, reject) => {
        this.emit('circuit-breaker.call')

        this.on('circuit-breaker.call.succeeded', (result) => {
          resolve(result)
        })

        this.on('circuit-breaker.call.failed', (err) => {
          reject(err)
        })
      })
    }

    let rejectCall = () => {
      return new Promise((resolve, reject) => {
        // State is open
        // reject
        log('Rejecting call while circuit is open', errors.CIRCUIT_IS_OPEN)
        setTimeout(reject(new Error(errors.CIRCUIT_IS_OPEN), 1))
      })
    }

    switch (this.state) {
    case states.CLOSED:
    case states.HALF_OPEN:
      return doCall()

    case states.OPEN:
      return rejectCall()
    }
  }
}
