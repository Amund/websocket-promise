/**
 * A promise-based WebSocket client providing async/await interface for WebSocket communications.
 * Supports JSON-RPC style requests with built-in error handling.
 *
 * @class
 * @example
 * // Basic usage
 * const client = new WebSocketPromise('ws://localhost:8080')
 * const response = await client.method('mirror', { data: 'test' })
 * client.close()
 */
export class WebSocketPromise {
	/** @type {string} */ #url = null
	/** @type {WebSocket|null} */ #transport = null
	/** @type {number|null} */ #timeout = null

	/**
	 * Map of pending requests waiting for server responses
	 * @type {Map<string, { resolve: Function, reject: Function }>}
	 */
	pendingRequests = new Map()

	/**
	 * Creates a new WebSocketPromise instance
	 * @param {string} url - WebSocket server URL to connect to
	 * @param {Object} [options] - Connection options
	 * @param {number} [options.timeout] - Connection timeout in milliseconds
	 */
	constructor(url, options = {}) {
		this.#url = url
		this.#timeout = options.timeout || 5000
	}

	/**
	 * Establishes and returns the WebSocket connection
	 * @returns {Promise<WebSocket>} Connected WebSocket instance
	 */
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
					this.#waitFor(this.#transport, 'open'),
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

	/**
	 * Sends a JSON-RPC style request and waits for response
	 * @param {string} method - RPC method name to call
	 * @param {Object} [params={}] - Parameters to send with the request
	 * @returns {Promise<Object>} Promise resolving with response data
	 * @throws {Error} Throws error if RPC response contains error
	 */
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

	#waitFor(target, event, options = { once: true, passive: true }) {
		return new Promise((resolve, reject) => {
			target.addEventListener(event, resolve, options)
			target.addEventListener('error', reject, options)
		})
	}

	/**
	 * Closes the WebSocket connection cleanly
	 */
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
