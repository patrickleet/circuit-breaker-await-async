import { CircuitBreaker } from 'main'

// default timeout is 5 seconds... need at least 10 for timeout tests
// setting to 15 to be safe
jasmine.DEFAULT_TIMEOUT_INTERVAL = 15 * 1000

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
      expect(typeof circuitBreaker.attempt).toBe('function')
    }).not.toThrow()

    expect(circuitBreaker).toBeDefined()
  })

  it('circuitBreaker.attempt success', async (done) => {
    let fn = jest.fn(() => {
      // mock async call using Promise
      return new Promise((resolve, reject) => {
        setTimeout(resolve, 100, 1)
      })
    })
    let circuitBreaker = new CircuitBreaker(fn)

    try {
      let result = await circuitBreaker.attempt()
      expect(result).toBe(1)
      done()
    } catch (e) {
      if (e) console.log(e)
    }
  })

  it('circuitBreaker.attempt 10 failures', async (done) => {
    let errorMessage = 'CIRCUIT_IS_OPEN'
    let fn = jest.fn(() => {
      // mock async call using Promise
      return new Promise((resolve, reject) => {
        setTimeout(reject, 1, new Error('Server Error'))
      })
    })
    let circuitBreaker = new CircuitBreaker(fn)

    try {
      await circuitBreaker.attempt()
    } catch (err) {
      if (err) console.log({msg: 'An error has occurred.', err})
      expect(err).toEqual(new Error(errorMessage))
      done()
    }
  })

  it('circuitBreaker.attempt timeout', async (done) => {
    let errorMessage = 'Request taking too long'
    let fn = jest.fn(() => {
      // mock async call using Promise
      return new Promise((resolve, reject) => {
        setTimeout(resolve, 15 * 1000, 1)
      })
    })
    let circuitBreaker = new CircuitBreaker(fn)

    try {
      await circuitBreaker.attempt()
    } catch (err) {
      if (err) console.log({msg: 'An error has occurred.', err})
      expect(err).toEqual(new Error(errorMessage))
      done()
    }
  })
})
