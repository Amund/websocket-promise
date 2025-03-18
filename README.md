# @amund/websocket-promise

[![Deno](https://img.shields.io/badge/Deno-1.0.0-blue?logo=deno)](https://deno.land)
[![JSR](https://jsr.io/badges/@amund/websocket-promise)](https://jsr.io/@amund/websocket-promise)

A promise-based WebSocket client, providing async/await interface for WebSocket communications.

- Supports JSON-RPC style requests
- Provides error handling for RPC errors
- No dependencies
- Vanilla JavaScript

## Installation

```bash
deno add @amund/websocket-promise
```

## Usage

```javascript
import WebSocketPromise from 'jsr:@amund/websocket-promise'

// Basic usage
const client = new WebSocketPromise('ws://localhost:8080')
const response = await client.method('mirror', { data: 'test' })
console.log(response) // { method: 'mirror', params: { data: 'test' } }

// Error handling
try {
	await client.method('unknown-method')
} catch (error) {
	console.error('RPC Error:', error.message)
}

// Cleanup
client.close()
```

## API

### `new WebSocketPromise(url, options)`

- `url`: WebSocket server URL
- `options`: Connection options (timeout, headers, etc.)

### `client.method(method, params)`

- Send JSON-RPC style requests
- Returns a promise that resolves with the response

### `client.close()`

- Close the WebSocket connection cleanly

## Testing

Tests use MSW (Mock Service Worker) for WebSocket mocking:

```bash
deno task test
# or watch mode
deno task test-watch
```

## Contributing

Contributions welcome! Please open issues or PRs on our [GitHub repository](https://github.com/amund/websocket-promise).

## License

[MIT](https://github.com/amund/websocket-promise/blob/main/LICENSE) (check repository for details)
