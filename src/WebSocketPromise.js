class WebSocketPromise {
	#url = null
	#transport = null
	#timeout = null
	pendingRequests = new Map()

	constructor(url, options = {}) {
		this.#url = url
		this.#timeout = options.timeout || 5000
	}

	async transport() {
		if (!this.#transport || this.#transport.readyState !== WebSocket.OPEN) {
			this.close()
			this.#transport = new WebSocket(this.#url)
			this.#transport.onerror = (event) => {
				this.#handleError(new Error(`WebSocket error: ${event.message}`))
			}
			this.#transport.onclose = (event) => {
				this.#handleError(new Error(`WebSocket closed: ${event.reason}`))
			}
			this.#transport.onmessage = this.#transportOnMessage.bind(this)

			try {
				let timeoutId
				await Promise.race([
					this.waitFor(this.#transport, 'open'),
					new Promise((_, reject) => {
						timeoutId = setTimeout(() => {
							reject(new Error(`Connection timed out after ${this.#timeout}ms`))
						}, this.#timeout)
					}),
				])
				clearTimeout(timeoutId)
			} catch (error) {
				this.close()
				this.#handleError(error)
				throw error
			}
		}
		return this.#transport
	}

	#transportOnMessage(event) {
		try {
			const response = JSON.parse(event.data)
			if (response.id) {
				const entry = this.pendingRequests.get(response.id)
				if (entry) {
					if (response.error) {
						entry.reject(new Error(response.error.message))
					} else {
						entry.resolve(response.result)
					}
					this.pendingRequests.delete(response.id)
				}
			}
		} catch (error) {
			this.#handleError(new Error(`Failed to parse message: ${error.message}`))
		}
	}

	async method(method, params = {}) {
		const request = {
			id: crypto.randomUUID(),
			method,
			params,
			jsonrpc: '2.0',
		}

		const promise = new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.pendingRequests.delete(request.id)
				reject(new Error(`Request timed out after ${this.#timeout}ms`))
			}, this.#timeout)

			this.pendingRequests.set(request.id, {
				resolve: (result) => {
					clearTimeout(timeout)
					resolve(result)
				},
				reject: (error) => {
					clearTimeout(timeout)
					reject(error)
				},
			})
		})

		const transport = await this.transport()
		transport.send(JSON.stringify(request))

		return promise
	}

	waitFor(target, event, options = { once: true, passive: true }) {
		return new Promise((resolve, reject) => {
			target.addEventListener(event, resolve, options)
			target.addEventListener('error', reject, options)
		})
	}

	close() {
		if (this.#transport) {
			this.#transport.close()
			this.#transport = null
		}
	}

	#handleError(error) {
		this.pendingRequests.forEach((entry) => entry.reject(error))
		this.pendingRequests.clear()
		console.error('WebSocket error:', error)
	}
}

export default WebSocketPromise
