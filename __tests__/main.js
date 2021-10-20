import debug from 'debug'
import { CircuitBreaker, states, errors } from 'main'

const log = debug('circuit-breaker-await-async:tests')

describe('main', () => {
  it('constructor', () => {
    expect(CircuitBreaker).toBeDefined()
    let circuitBreaker
    expect(() => {
      circuitBreaker = new CircuitBreaker()
    }).toThrow()

    expect(() => {
      const fn = jest.fn()
      circuitBreaker = new CircuitBreaker(fn)
      expect(typeof circuitBreaker.call).toBe('function')
    }).not.toThrow()

    expect(circuitBreaker).toBeDefined()
  })

  it('circuitBreaker.call with CLOSED state', async () => {
    log('Starting test 1...')
    const fn = jest.fn(() => {
      // mock async call using Promise
      return new Promise((resolve, reject) => {
        setTimeout(resolve, 100, 1)
      })
    })
    const circuitBreaker = new CircuitBreaker(fn)

    try {
      const result = await circuitBreaker.call()
      expect(result).toBe(1)
      expect(circuitBreaker.state).toBe(states.CLOSED)
    } catch (e) {
      if (e) log(e)
    }
  })

  it('circuitBreaker.call with OPEN state', async () => {
    log('Starting test 2...')
    const fn = jest.fn(() => {
      // mock async call using Promise
      return new Promise((resolve, reject) => {
        setTimeout(resolve, 100, 1)
      })
    })
    const circuitBreaker = new CircuitBreaker(fn, {
      state: states.OPEN
    })

    try {
      const r = await circuitBreaker.call()
      console.log(r)
    } catch (e) {
      expect(e).toEqual(new Error(errors.CIRCUIT_IS_OPEN))
    }
  })

  it('circuitBreaker.call with HALF_OPEN state', async () => {
    log('Starting test 3...')
    const fn = jest.fn(() => {
      // mock async call using Promise
      return new Promise((resolve, reject) => {
        setTimeout(resolve, 100, 1)
      })
    })
    const circuitBreaker = new CircuitBreaker(fn, {
      state: states.HALF_OPEN
    })

    try {
      const result = await circuitBreaker.call()
      expect(result).toBe(1)
      expect(circuitBreaker.state).toBe(states.CLOSED)
    } catch (e) {
      if (e) log(e)
    }
  })

  it('circuitBreaker.call with HALF_OPEN state and failing async call', async () => {
    log('Starting test 3...')
    const fn = jest.fn(() => {
      // mock async call using Promise
      return new Promise((resolve, reject) => {
        setTimeout(reject, 100, new Error('Server Error'))
      })
    })
    const circuitBreaker = new CircuitBreaker(fn, {
      state: states.HALF_OPEN
    })

    try {
      await circuitBreaker.call()
    } catch (e) {
      if (e) log(e)
      expect(e).toEqual(new Error('CIRCUIT_IS_OPEN'))
      expect(circuitBreaker.state).toBe(states.OPEN)
    }
  })

  it('circuitBreaker.call errors after 10 failures', async () => {
    log('Starting end to end test')

    // Let's start with simulating a non-working API
    const fn = jest.fn(() => {
      // mock async call using Promise
      return new Promise((resolve, reject) => {
        setTimeout(reject, 1, new Error('Server Error'))
      })
    })

    // smaller timeouts for faster tests
    const circuitBreaker = new CircuitBreaker(fn, {
      callTimeoutMs: 100,
      resetTimeoutMs: 1000
    })

    try {
      await circuitBreaker.call()
    } catch (err) {
      log('expected error after 10 attempts')
      expect(err.toString().indexOf('CIRCUIT_IS_OPEN')).toBeGreaterThan(-1)
      expect(circuitBreaker.state).toEqual(states.OPEN)
    }
  })

  it('circuitBreaker.call - end to end', async () => {
    log('Starting end to end test')

    // Let's start with simulating a non-working API
    const fn = jest.fn(() => {
      // mock async call using Promise
      return new Promise((resolve, reject) => {
        setTimeout(reject, 1, new Error('Server Error'))
      })
    })

    // smaller timeouts for faster tests
    const circuitBreaker = new CircuitBreaker(fn, {
      callTimeoutMs: 100,
      resetTimeoutMs: 1000
    })

    // In 15 callTimeoutMs, while CircuitBreaker state is OPEN
    // make another attempt, that should receive an error
    setTimeout(async () => {
      log('15 second timeout executed')
      try {
        expect(circuitBreaker.state).toBe(states.OPEN)
        await circuitBreaker.call()
      } catch (err) {
        if (err) log({ msg: 'Expected error has occurred while the circuit is open' })
        expect(err).toEqual(new Error('CIRCUIT_IS_OPEN'))
        expect(circuitBreaker.state).toBe(states.OPEN)
      }
    }, 15 * circuitBreaker.callTimeoutMs)

    // 25 callTimeoutMs after the start of the test,
    // the API becomes responsive again
    // allowing original request to resolve
    setTimeout(() => {
      log('25 second timeout executed')
      fn.mockImplementation(() => {
        return new Promise((resolve, reject) => {
          setTimeout(resolve, 100, 1)
        })
      })
    }, 25 * circuitBreaker.callTimeoutMs)

    // 30 callTimeoutMs after the start of the test,
    // another call is made, the state should be
    // HALF_OPEN, and result in a success
    // and the state becoming CLOSED
    setTimeout(async () => {
      log('30 second timeout executed')
      try {
        expect(circuitBreaker.state).toBe(states.HALF_OPEN)
        log('hello')
        const result = await circuitBreaker.call()
        expect(result).toBe(1)
        expect(circuitBreaker.state).toBe(states.CLOSED)
      } catch (err) {
        if (err) log('ERROR IN TEST')
      }
    }, 25 * circuitBreaker.callTimeoutMs)

    // This is the first request
    // the 3rd party server will be offline
    // for 10 attempts, resulting in an error
    // and the circut being open
    try {
      await circuitBreaker.call()
    } catch (err) {
      log('expected error after 10 attempts')
      expect(err.toString().indexOf('CIRCUIT_IS_OPEN')).toBeGreaterThan(-1)
      expect(circuitBreaker.state).toEqual(states.OPEN)
    }
  })

  it('circuitBreaker.call - with arguments', async () => {
    log('Starting arguments test')

    log('Starting test 1...')
    const fn = jest.fn((one, two, three) => {
      // mock async call using Promise
      return new Promise((resolve, reject) => {
        setTimeout(resolve, 100, [one, two, three])
      })
    })
    const circuitBreaker = new CircuitBreaker(fn)

    try {
      const result = await circuitBreaker.call(1, 2, 3)
      expect(result).toStrictEqual([1, 2, 3])
      expect(circuitBreaker.state).toBe(states.CLOSED)
    } catch (e) {
      if (e) log(e)
    }
  })

  it('circuitBreaker.call errors preserves args between calls', async () => {
    log('Starting end to end test')

    // Let's start with simulating a non-working API
    const fn = jest.fn((one, two, three) => {
      // mock async call using Promise
      return new Promise((resolve, reject) => {
        setTimeout(reject, 1, new Error(`Server Error ${[one, two, three]}`))
      })
    })

    // smaller timeouts for faster tests
    const circuitBreaker = new CircuitBreaker(fn, {
      callTimeoutMs: 100,
      resetTimeoutMs: 1000
    })

    try {
      await circuitBreaker.call(1, 2, 3)
    } catch (err) {
      log('expected error after 10 attempts', err)
      expect(err.toString().indexOf('CIRCUIT_IS_OPEN')).toBeGreaterThan(-1)
      expect(err.toString().indexOf('Server Error 1,2,3')).toBeGreaterThan(-1)
      expect(circuitBreaker.state).toEqual(states.OPEN)
    }
  })
})
