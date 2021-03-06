import { Message, Core } from 'daf-core'
import { MessageValidator } from '../index'
import fetchMock from "jest-fetch-mock"
fetchMock.enableMocks()

describe('daf-url', () => {
  const validator = new MessageValidator()

  const core = new Core({
    identityProviders: [],
    serviceControllers: [],
    didResolver: { resolve: jest.fn() },
    messageValidator: validator,
  })

  it('should reject unknown message type', async () => {
    const message = new Message({ raw: 'test', meta: { type: 'test' } })
    expect(validator.validate(message, core)).rejects.toEqual('Unsupported message type')
  })

  it('should transform message after standard URL', async () => {
    const JWT =
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NkstUiJ9.eyJpYXQiOjE1NzU5Njc1MzEsInR5cGUiOiJzZHIiLCJ0YWciOiJzZXNzaW9uLTEyMyIsImNsYWltcyI6W3sicmVhc29uIjoiV2UgbmVlZCB5b3VyIG5hbWUiLCJjbGFpbVR5cGUiOiJuYW1lIn1dLCJpc3MiOiJkaWQ6ZXRocjoweDViMmIwMzM1Mzk4NDM2MDFmYjgxZGYxNzA0OTE4NzA0ZmQwMTQxZmEifQ.KoHbpJ5HkLLIw8iEqsu2Jql9m5dbydNy2zO53GKuIbwfPOW842_IPXw2zwVtj0FcEuHUkzhx-bhS28Zhmvkv2gE'
    const message = new Message({
      raw: 'https://identity.foundation/ssi/?c_i=' + JWT,
      meta: {
        type: 'QRCode',
      },
    })
    expect(validator.validate(message, core)).rejects.toEqual('Unsupported message type')
    expect(message.raw).toEqual(JWT)
  })

  it('should try to load data from URL if URL is not standard', async() => {
    const message = new Message({raw: 'https://example.com/public-profile.jwt'})
    fetchMock.mockResponse('mockbody')
    expect.assertions(2)
    try {
      await validator.validate(message, core)
    } catch (e) {
      expect(e).toMatch('Unsupported message type');
    }

    expect(message.raw).toEqual('mockbody')
    
  })
})
