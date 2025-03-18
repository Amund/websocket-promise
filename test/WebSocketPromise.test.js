import { assertEquals } from '@std/assert'
import { setupServer } from 'msw/node'
import { handlers, hostname, port } from './mock/handlers.js'
import WebSocketPromise from '../src/WebSocketPromise.js'

const server = setupServer(...handlers)
server.listen()

Deno.test('WebSocketPromise - Simple', async () => {
	const client = new WebSocketPromise(`ws://${hostname}:${port}`)
	const response = await client.method('mirror', 'param')
	assertEquals(response, { method: 'mirror', params: 'param' })
	client.close()
})

Deno.test('WebSocketPromise - Multiple', async () => {
	const client = new WebSocketPromise(`ws://${hostname}:${port}`)
	const response1 = await client.method('wait', { delay: 20 })
	const response2 = await client.method('wait', { delay: 10 })
	assertEquals(response1, 'waited for 20ms')
	assertEquals(response2, 'waited for 10ms')
	client.close()
})

Deno.test('WebSocketPromise - Unknown method', async () => {
	const client = new WebSocketPromise(`ws://${hostname}:${port}`)
	try {
		await client.method('unknown')
		throw new Error('Test should have thrown but passed')
	} catch (error) {
		assertEquals(error.message, 'Method not found')
	} finally {
		client.close()
	}
})
