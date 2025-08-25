## Emercoin MCP Server v2.0

A comprehensive Model Context Protocol (MCP) server that provides HTTP/JSON access to all Emercoin CLI functionality with integrated formatting utilities.

## Features

*   **Complete RPC Coverage**: All 100+ Emercoin RPC endpoints organized by category
*   **Formatting Integration**: Built-in support for `emercoin-format.py` and `emercoin-value.py` utilities
*   **Multiple API Styles**: Category-based routes, generic RPC calls, and legacy compatibility
*   **Enhanced Error Handling**: Detailed error responses with stderr output and exit codes
*   **Auto-Discovery**: `/endpoints` route lists all available methods by category
*   **Health Monitoring**: Comprehensive health check with endpoint count
*   **CORS Support**: Cross-origin requests enabled
*   **High Performance**: Uses `spawn` for better process management

## Prerequisites

*   Node.js 14.0.0 or higher
*   Python 3 (for formatting utilities)
*   Emercoin daemon (emercoind) running with RPC enabled
*   emercoin-cli in your PATH or specified via environment variable

## Installation

```plaintext
git clone <repository>
cd emercoin-mcp-server
npm install
```

## Configuration

Configure using environment variables:

```plaintext
export PORT=7331                    # Server port (default: 7331)
export EMERCOIN_CLI_PATH=emercoin-cli  # Path to emercoin-cli
export RPC_USER=your_rpc_username      # RPC username
export RPC_PASSWORD=your_rpc_password  # RPC password  
export RPC_PORT=6662                   # RPC port (default: 6662)
export RPC_HOST=127.0.0.1             # RPC host (default: 127.0.0.1)
```

## Running the Server

```plaintext
npm start
# or for development with auto-reload:
npm run dev
```

## API Endpoints

### Discovery & Health

*   `GET /health` - Server health and statistics
*   `GET /endpoints` - List all available RPC methods by category

### Category-Based Routes

All RPC methods are available via category-based routes:

#### Blockchain Operations

*   `POST /blockchain/getblockchaininfo`
*   `POST /blockchain/getblockcount`
*   `POST /blockchain/getbestblockhash`
*   `POST /blockchain/getblock` - params: `["blockhash", verbosity]`
*   And 20+ more blockchain endpoints...

#### Name Operations (Emercoin's unique feature)

*   `POST /names/name_show` - params: `["name", "valuetype", "filepath"]`
*   `POST /names/name_new` - params: `["name", "value", days, "toaddress", "valuetype"]`
*   `POST /names/name_update` - params: `["name", "value", days, "toaddress", "valuetype"]`
*   `POST /names/name_filter` - params: `["regexp", maxage, from, nb, "stat", "valuetype"]`
*   And 10+ more name endpoints...

#### Wallet Operations

*   `POST /wallet/getbalance`
*   `POST /wallet/getnewaddress` - params: `["label", "address_type"]`
*   `POST /wallet/sendtoaddress` - params: `["address", amount, "comment", "comment_to", ...]`
*   `POST /wallet/listtransactions`
*   And 40+ more wallet endpoints...

#### Other Categories

*   **Control**: `getinfo`, `stop`, `uptime`, etc.
*   **Mining**: `getmininginfo`, `getblocktemplate`, etc.
*   **Network**: `getpeerinfo`, `getnetworkinfo`, etc.
*   **Raw Transactions**: `createrawtransaction`, `signrawtransaction`, etc.
*   **Utilities**: `validateaddress`, `estimatesmartfee`, etc.
*   **Randpay**: Emercoin's micropayment system
*   **ZMQ**: Notification system

### Generic RPC Routes

*   `POST /rpc/:method` - Call any RPC method directly
*   `POST /rpc` - Legacy RPC passthrough

### Request Format

All endpoints accept JSON with optional formatting:

```plaintext
{
  "params": ["param1", "param2"],
  "format": true,        // Apply emercoin-format.py
  "extractValue": true   // Apply emercoin-value.py
}
```

### Examples

#### Get blockchain info:

```plaintext
curl -X POST http://localhost:7331/blockchain/getblockchaininfo \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### Show name with formatting:

```plaintext
curl -X POST http://localhost:7331/names/name_show \
  -H "Content-Type: application/json" \
  -d '{"params": ["dns:emercoin.com"], "format": true}'
```

#### Extract value from name:

```plaintext
curl -X POST http://localhost:7331/names/name_show \
  -H "Content-Type: application/json" \
  -d '{"params": ["dns:emercoin.com"], "extractValue": true}'
```

#### Send EMC:

```plaintext
curl -X POST http://localhost:7331/wallet/sendtoaddress \
  -H "Content-Type: application/json" \
  -d '{"params": ["EMC_ADDRESS", 1.0, "Payment", "To John"]}'
```

## Formatting Utilities

The server integrates two Python utilities:

### emercoin-format.py

Cleans text output by replacing literal `\n` with actual line breaks.

### emercoin-value.py

Extracts the `value` field from JSON responses, useful for name operations.

Enable formatting by adding `"format": true` or `"extractValue": true` to your request body.

## Security Considerations

*   **Network Security**: Run behind HTTPS reverse proxy
*   **Access Control**: Use firewall rules to limit access
*   **Credentials**: Use strong RPC credentials, consider `rpcauth`
*   **Port Security**: Default port 7331 avoids common conflicts
*   **Input Validation**: All user input is properly escaped

## Error Handling

Detailed error responses include:

*   Error message
*   stderr output from emercoin-cli
*   Exit code
*   Method name for context

## Development

```plaintext
npm run dev  # Auto-reload on changes
```

## License

MIT