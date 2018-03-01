import EventEmitter from 'events'

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

    this.state = {
      currentAttempts: 0
    }

    this.on('circuitbreaker.attempt', async () => {
      if (this.state.currentAttempts < this.maxFailures) {
        let result = await this.fn()
        if (result) {
          this.emit('circuitbreaker.attempt.succeeded', 1)
        }

        this.currentAttempts++
      } else {
        this.emit('circuitbreaker.reset')
      }
    })
  }

  async attempt(cb) {
    return new Promise((resolve, reject) => {
      this.emit('circuitbreaker.attempt')

      this.on('circuitbreaker.attempt.succeeded', (result) => {
        resolve(result)
      })

      setTimeout(() => {
        console.log('timeout')
        reject(new Error('Request taking too long'))
      }, this.resetTimeoutMs)
    })
  }
}

