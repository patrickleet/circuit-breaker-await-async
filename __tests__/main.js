import debug from 'debug'
import { CircuitBreaker, states, errors } from 'main'

const log = debug('circuit-breaker-await-async:tests')

// default timeout is 5 seconds...
jasmine.DEFAULT_TIMEOUT_INTERVAL = 60 * 1000

describe('main', () => {
  it('exists', () => {
    expect(CircuitBreaker).toBeDefined()
    let circuitBreaker
    expect(() => {
      circuitBreaker = new CircuitBreaker()
    }).toThrow()

    expect(() => {
      let fn = jest.fn()
      circuitBreaker = new CircuitBreaker(fn)
      expect(typeof circuitBreaker.call).toBe('function')
    }).not.toThrow()

    expect(circuitBreaker).toBeDefined()
  })

  it('circuitBreaker.call with CLOSED state', async (done) => {
    log('Starting test 1...')
    let fn = jest.fn(() => {
      // mock async call using Promise
      return new Promise((resolve, reject) => {
        setTimeout(resolve, 100, 1)
      })
    })
    let circuitBreaker = new CircuitBreaker(fn)

    try {
      let result = await circuitBreaker.call()
      expect(result).toBe(1)
      expect(circuitBreaker.state).toBe(states.CLOSED)
      done()
    } catch (e) {
      if (e) log(e)
    }
  })

  it('circuitBreaker.call with OPEN state', async (done) => {
    log('Starting test 2...')
    let fn = jest.fn(() => {
      // mock async call using Promise
      return new Promise((resolve, reject) => {
        setTimeout(resolve, 100, 1)
      })
    })
    let circuitBreaker = new CircuitBreaker(fn, {
      state: states.OPEN
    })

    try {
      let r = await circuitBreaker.call()
      console.log(r)
    } catch (e) {
      expect(e).toEqual(new Error(errors.CIRCUIT_IS_OPEN))
      done()
    }
  })

  it('circuitBreaker.call with HALF_OPEN state', async (done) => {
    log('Starting test 3...')
    let fn = jest.fn(() => {
      // mock async call using Promise
      return new Promise((resolve, reject) => {
        setTimeout(resolve, 100, 1)
      })
    })
    let circuitBreaker = new CircuitBreaker(fn, {
      state: states.HALF_OPEN
    })

    try {
      let result = await circuitBreaker.call()
      expect(result).toBe(1)
      expect(circuitBreaker.state).toBe(states.CLOSED)
      done()
    } catch (e) {
      if (e) log(e)
    }
  })

  it('circuitBreaker.call errors after 10 failures', async (done) => {
    log('Starting end to end test')

    // Let's start with simulating a non-working API
    let fn = jest.fn(() => {
      // mock async call using Promise
      return new Promise((resolve, reject) => {
        setTimeout(reject, 1, new Error('Server Error'))
      })
    })

    let circuitBreaker = new CircuitBreaker(fn)

    try {
      await circuitBreaker.call()
    } catch (err) {
      log('expected error after 10 attempts')
      expect(err).toEqual(new Error('CIRCUIT_IS_OPEN'))
      expect(circuitBreaker.state).toEqual(states.OPEN)
      done()
    }
  })

  it('circuitBreaker.call 10 failures trips the circuit breaker, further requests receive CIRCUIT_IS_OPEN error.', async (done) => {
    log('Starting end to end test')

    // Let's start with simulating a non-working API
    let fn = jest.fn(() => {
      // mock async call using Promise
      return new Promise((resolve, reject) => {
        setTimeout(reject, 1, new Error('Server Error'))
      })
    })

    let circuitBreaker = new CircuitBreaker(fn)

    // In 15 seconds, while CircuitBreaker state is OPEN
    // make another attempt, that should receive an error
    setTimeout(async () => {
      log('15 second timeout executed')
      try {
        expect(circuitBreaker.state).toBe(states.OPEN)
        await circuitBreaker.call()
      } catch (err) {
        if (err) log({msg: 'Expected error has occurred while the circuit is open'})
        expect(err).toEqual(new Error('CIRCUIT_IS_OPEN'))
        expect(circuitBreaker.state).toBe(states.OPEN)
      }
    }, 15 * 1000)

    // 25 seconds after the start of the test,
    // the API becomes responsive again
    // allowing original request to resolve
    setTimeout(() => {
      log('25 second timeout executed')
      fn.mockImplementation(() => {
        return new Promise((resolve, reject) => {
          setTimeout(resolve, 100, 1)
        })
      })
    }, 25 * 1000)

    // 30 seconds after the start of the test,
    // another call is made, the state should be
    // HALF_OPEN, and result in a success
    // and the state becoming CLOSED
    setTimeout(async () => {
      log('30 second timeout executed')
      try {
        expect(circuitBreaker.state).toBe(states.HALF_OPEN)
        log('hello')
        let result = await circuitBreaker.call()
        expect(result).toBe(1)
        expect(circuitBreaker.state).toBe(states.CLOSED)
        done()
      } catch (err) {
        if (err) log('ERROR IN TEST')
      }
    }, 25 * 1000)

    // This is the first request
    // the 3rd party server will be offline
    // for 10 attempts, resulting in an error
    // and the circut being open
    try {
      await circuitBreaker.call()
    } catch (err) {
      log('expected error after 10 attempts')
      expect(err).toEqual(new Error('CIRCUIT_IS_OPEN'))
      expect(circuitBreaker.state).toEqual(states.OPEN)
    }
  })
})
