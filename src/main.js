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
    this.errors = []

    this.currentAttempt = 0
    this.resetAttempt = 0

    const handleCall = async () => {
      const { args, state } = this
      log('circuit-breaker.call received', { args, state })

      const isHalfOpen = state === states.HALF_OPEN
      if (isHalfOpen) {
        this.currentAttempt = this.maxFailures - 1
      }

      if (this.currentAttempt < this.maxFailures) {
        try {
          if (isHalfOpen) {
            log(`HalfOpen trial call`)
          } else {
            this.currentAttempt++
            log(`Attempt ${this.currentAttempt} Started`)
          }
          let result = await this.fn(...args)
          this.emit('circuit-breaker.call.succeeded', result)
        } catch (e) {
          this.errors.push(e)
          if (isHalfOpen) {
            log(`HalfOpen trail called has failed: ${e.message}`)
            this.emit('circuit-breaker.trip')
            this.emit('circuit-breaker.call.failed', new Error(errors.CIRCUIT_IS_OPEN))
          } else {
            log(`Attempt ${this.currentAttempt} Failed: ${e.message}`)
            // attempt again in callTimeoutMs
            setTimeout(() => {
              this.emit('circuit-breaker.call')
            }, this.callTimeoutMs)
          }
        }
      } else {
        log('Calls to your function have failed 10 times in a row. Tripping the circuit to prevent more incoming requests.')
        this.emit('circuit-breaker.trip')
        this.emit('circuit-breaker.call.failed', new Error(`${errors.CIRCUIT_IS_OPEN} - the following errors occurred: ${this.errors}`))
      }
    }

    const handleCallSucceeded = () => {
      this.state = states.CLOSED
      this.currentAttempt = 0
    }

    const handleTrip = async () => {
      log('tripping circuitbreaker')
      this.state = states.OPEN

      // in resetTimeoutMs, attempt resetting the circuit
      setTimeout(() => {
        this.emit('circuit-breaker.attempt-reset')
      }, this.resetTimeoutMs)
    }

    const handleAttemptedReset = async () => {
      log('attempting to reset circuit breaker')
      this.state = states.HALF_OPEN
    }

    this.on('circuit-breaker.call', handleCall)
    this.on('circuit-breaker.call.succeeded', handleCallSucceeded)
    this.on('circuit-breaker.trip', handleTrip)
    this.on('circuit-breaker.attempt-reset', handleAttemptedReset)
  }

  call() {
    this.args = arguments

    const doCall = ({ state }) => {
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
      return doCall({ args: this.args, state: this.state })

    case states.OPEN:
      return rejectCall()
    }
  }
}
