import { ws } from 'msw'

export const hostname = 'localhost'
export const port = 8200

const app = ws.link(`ws://${hostname}:${port}`)

export const handlers = [
	app.addEventListener('connection', ({ client }) => {
		client.addEventListener('message', (event) => {
			const request = JSON.parse(event.data)
			const response = {
				jsonrpc: '2.0',
				id: request.id,
			}
			switch (request.method) {
				case 'mirror':
					response.result = { method: request.method, params: request.params }
					break
				case 'wait': {
					const { delay } = request.params
					response.result = 'waited for ' + delay + 'ms'
					setTimeout(() => client.send(JSON.stringify(response)), delay)
					return
				}
				default:
					response.error = { code: -32601, message: 'Method not found' }
			}
			client.send(JSON.stringify(response))
		})
	}),
]
