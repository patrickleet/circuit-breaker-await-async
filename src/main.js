import debug from 'debug'
import EventEmitter from 'events'

const log = debug('circuit-breaker-await-async')

const states = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
}

const errors = {
  CIRCUIT_IS_OPEN: 'CIRCUIT_IS_OPEN'
}

export class CircuitBreaker extends EventEmitter {
  constructor(fn) {
    if (!fn) {
      throw new Error('fn is required')
    }

    super()

    this.fn = fn
    this.maxFailures = 10
    this.callTimeoutMs = 1 * 1000
    this.resetTimeoutMs = 10 * 1000

    this.currentAttempt = 0
    this.state = states.CLOSED

    let closedStateAttempt = async () => {
      if (this.currentAttempt < this.maxFailures) {
        try {
          this.currentAttempt++
          log(`attempt ${this.currentAttempt}`)
          let result = await this.fn()
          if (result) {
            this.emit('circuitbreaker.attempt.succeeded', 1)
          } else {
            throw new Error('Unexpected result')
          }
        } catch (e) {
          log(e)
          this.emit('circuitbreaker.attempt')
        }
      } else {
        log('Calls to your function have failed 10 times in a row')
        this.emit('circuitbreaker.trip')
        this.emit('circuitbreaker.attempt')
      }
    }

    let openStateAttempt = () => {
      log('circuitBreaker is open')
      this.emit('circuitbreaker.attempt.rejected', new Error(errors.CIRCUIT_IS_OPEN))
    }

    this.on('circuitbreaker.attempt', async () => {
      switch (this.state) {
      case states.CLOSED:

        closedStateAttempt()

        break

      case states.OPEN:

        openStateAttempt()
      }
    })

    this.on('circuitbreaker.trip', async () => {
      log('tripping circuitbreaker')
      this.state = states.OPEN
    })
  }

  async attempt(cb) {
    return new Promise((resolve, reject) => {
      this.emit('circuitbreaker.attempt')

      this.on('circuitbreaker.attempt.succeeded', (result) => {
        resolve(result)
      })

      this.on('circuitbreaker.attempt.rejected', (err) => {
        reject(err)
      })

      setTimeout(() => {
        log('attempt has reached timeout')
        reject(new Error('Request taking too long'))
      }, this.resetTimeoutMs)
    })
  }
}
