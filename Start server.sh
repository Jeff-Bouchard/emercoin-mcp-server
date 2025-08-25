 # Start server
cd /home/rooty/Desktop/emercoin-mcp-server
npm install
npm start

# Get blockchain info
curl -X POST http://localhost:7331/blockchain/getblockchaininfo

# Show name with formatting
curl -X POST http://localhost:7331/names/name_show \
  -H "Content-Type: application/json" \
  -d '{"params": ["dns:emercoin.com"], "format": true}'

# Extract value from name
curl -X POST http://localhost:7331/names/name_show \
  -H "Content-Type: application/json" \
  -d '{"params": ["dns:emercoin.com"], "extractValue": true}'