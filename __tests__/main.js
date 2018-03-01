import { CircuitBreaker } from 'main'

// default timeout is 5 seconds... need at least 10 for timeout tests
// setting to 30 to be safe
jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000

describe('main', () => {
  it('exists', () => {
    expect(CircuitBreaker).toBeDefined()
    let circuitbreaker
    expect(() => {
      circuitbreaker = new CircuitBreaker()
    }).toThrow()

    expect(() => {
      let fn = jest.fn()
      circuitbreaker = new CircuitBreaker(fn)
      expect(typeof circuitbreaker.attempt).toBe('function')
    }).not.toThrow()

    expect(circuitbreaker).toBeDefined()
  })

  it('circuitbreaker.attempt success', async (done) => {
    let fn = jest.fn(() => {
      // mock async call using Promise
      return new Promise((resolve, reject) => {
        setTimeout(resolve, 100, 1)
      })
    })
    let circuitbreaker = new CircuitBreaker(fn)

    try {
      let result = await circuitbreaker.attempt()
      expect(result).toBe(1)
      done()
    } catch (e) {
      if (e) console.log(e)
    }
  })

  // it('circuitbreaker.call success', () => {
  //   let fn = jest.fn(() => {
  //     return new Promise(function(resolve, reject) {
  //       setTimeout(() => {
  //         resolve(1)
  //       }, 100)
  //     })
  //   })

  //   let circuitbreaker = new CircuitBreaker(fn)
  //   expect(typeof circuitbreaker.call).toBe('function')

  //   circuitbreaker.call(fn, (err, result) => {
  //     if (err) console.log(err)
  //     expect(result).toBe(1)
  //     done()
  //   })

  //   expect(fn).toBeCalled()
  // })

  // it('circuitbreaker.call returns error ‘CIRCUIT_IS_OPEN’ when ten attempts have failed', (done) => {
  //   let circuitbreaker = new CircuitBreaker()
  //   expect(typeof circuitbreaker.call).toBe('function')
  //   let fn = jest.fn(() => {
  //     throw new Error('ERROR')
  //   })

  //   circuitbreaker.call(fn, (err, result) => {
  //     if (err) console.error(err)
  //     expect(err).toEqual(new Error('CIRCUIT_IS_OPEN'))
  //     done()
  //   })

  //   expect(fn).toBeCalled()
  // })
})
