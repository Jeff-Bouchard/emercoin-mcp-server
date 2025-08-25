const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
  port: process.env.PORT || 7331,
  emercoinCliPath: process.env.EMERCOIN_CLI_PATH || 'emercoin-cli',
  rpcUser: process.env.RPC_USER || 'rpcuser',
  rpcPassword: process.env.RPC_PASSWORD || 'rpcpassword',
  rpcPort: process.env.RPC_PORT || '6662',
  rpcHost: process.env.RPC_HOST || '127.0.0.1',
};

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Helper function to execute emercoin-cli commands
async function execEmercoinCli(method, params = [], options = {}) {
  const { format = false, extractValue = false } = options;
  
  // Build command arguments
  const args = [
    `-rpcuser=${CONFIG.rpcUser}`,
    `-rpcpassword=${CONFIG.rpcPassword}`,
    `-rpcport=${CONFIG.rpcPort}`,
    `-rpcconnect=${CONFIG.rpcHost}`,
    method,
    ...params
  ];
  
  return new Promise((resolve, reject) => {
    const child = spawn(CONFIG.emercoinCliPath, args);
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      if (code !== 0) {
        console.error(`Command failed with code ${code}: ${stderr}`);
        return reject({ 
          error: `Command failed with exit code ${code}`, 
          stderr: stderr.trim(),
          code 
        });
      }
      
      let result = stdout.trim();
      
      // Apply formatting if requested
      if (format && result) {
        try {
          const formatScript = path.join(__dirname, 'emercoin-format.py');
          const formatChild = spawn('python3', [formatScript, result]);
          let formattedOutput = '';
          
          formatChild.stdout.on('data', (data) => {
            formattedOutput += data.toString();
          });
          
          formatChild.on('close', () => {
            result = formattedOutput.trim() || result;
            processResult();
          });
        } catch (e) {
          processResult();
        }
      } else {
        processResult();
      }
      
      function processResult() {
        // Extract value if requested
        if (extractValue && result) {
          try {
            const valueScript = path.join(__dirname, 'emercoin-value.py');
            const valueChild = spawn('python3', [valueScript, result]);
            let extractedValue = '';
            
            valueChild.stdout.on('data', (data) => {
              extractedValue += data.toString();
            });
            
            valueChild.on('close', () => {
              resolve(extractedValue.trim() || result);
            });
          } catch (e) {
            finalizeResult();
          }
        } else {
          finalizeResult();
        }
      }
      
      function finalizeResult() {
        try {
          // Try to parse JSON output
          if (result) {
            const parsed = JSON.parse(result);
            resolve(parsed);
          } else {
            resolve({ success: true });
          }
        } catch (e) {
          // Return raw text if not JSON
          resolve(result || 'Success');
        }
      }
    });
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'emercoin-mcp-server',
    version: require('./package.json').version,
    timestamp: new Date().toISOString(),
    endpoints: Object.keys(EMERCOIN_ENDPOINTS).length
  });
});

// Emercoin RPC endpoints mapping
const EMERCOIN_ENDPOINTS = {
  // Blockchain
  'getbestblockhash': { category: 'blockchain', params: [] },
  'getblock': { category: 'blockchain', params: ['blockhash', 'verbosity'] },
  'getblockchaininfo': { category: 'blockchain', params: [] },
  'getblockcount': { category: 'blockchain', params: [] },
  'getblockfilter': { category: 'blockchain', params: ['blockhash', 'filtertype'] },
  'getblockhash': { category: 'blockchain', params: ['height'] },
  'getblockheader': { category: 'blockchain', params: ['blockhash', 'verbose'] },
  'getblockstats': { category: 'blockchain', params: ['hash_or_height', 'stats'] },
  'getchaintips': { category: 'blockchain', params: [] },
  'getchaintxstats': { category: 'blockchain', params: ['nblocks', 'blockhash'] },
  'getdifficulty': { category: 'blockchain', params: [] },
  'getmempoolancestors': { category: 'blockchain', params: ['txid', 'verbose'] },
  'getmempooldescendants': { category: 'blockchain', params: ['txid', 'verbose'] },
  'getmempoolentry': { category: 'blockchain', params: ['txid'] },
  'getmempoolinfo': { category: 'blockchain', params: [] },
  'getrawmempool': { category: 'blockchain', params: ['verbose'] },
  'gettxout': { category: 'blockchain', params: ['txid', 'n', 'include_mempool'] },
  'gettxoutproof': { category: 'blockchain', params: ['txids', 'blockhash'] },
  'gettxoutsetinfo': { category: 'blockchain', params: [] },
  'preciousblock': { category: 'blockchain', params: ['blockhash'] },
  'pruneblockchain': { category: 'blockchain', params: ['height'] },
  'savemempool': { category: 'blockchain', params: [] },
  'scantxoutset': { category: 'blockchain', params: ['action', 'scanobjects'] },
  'verifychain': { category: 'blockchain', params: ['checklevel', 'nblocks'] },
  'verifytxoutproof': { category: 'blockchain', params: ['proof'] },

  // Name operations
  'name_delete': { category: 'names', params: ['name'] },
  'name_filter': { category: 'names', params: ['regexp', 'maxage', 'from', 'nb', 'stat', 'valuetype'] },
  'name_history': { category: 'names', params: ['name', 'fullhistory', 'valuetype'] },
  'name_indexinfo': { category: 'names', params: [] },
  'name_list': { category: 'names', params: ['name', 'valuetype'] },
  'name_mempool': { category: 'names', params: ['valuetype'] },
  'name_new': { category: 'names', params: ['name', 'value', 'days', 'toaddress', 'valuetype'] },
  'name_scan': { category: 'names', params: ['start-name', 'max-returned', 'max-value-length', 'valuetype'] },
  'name_scan_address': { category: 'names', params: ['address', 'max-value-length', 'valuetype'] },
  'name_show': { category: 'names', params: ['name', 'valuetype', 'filepath'] },
  'name_update': { category: 'names', params: ['name', 'value', 'days', 'toaddress', 'valuetype'] },
  'name_updatemany': { category: 'names', params: ['operations'] },
  'sendtoname': { category: 'names', params: ['name', 'amount', 'comment', 'comment_to'] },

  // Control
  'getinfo': { category: 'control', params: [] },
  'getmemoryinfo': { category: 'control', params: ['mode'] },
  'getrpcinfo': { category: 'control', params: [] },
  'help': { category: 'control', params: ['command'] },
  'logging': { category: 'control', params: ['include_category', 'exclude_category'] },
  'stop': { category: 'control', params: [] },
  'uptime': { category: 'control', params: [] },

  // Generating
  'generate': { category: 'generating', params: ['nblocks', 'maxtries'] },
  'generatetoaddress': { category: 'generating', params: ['nblocks', 'address', 'maxtries'] },

  // Mining
  'getauxblock': { category: 'mining', params: ['hash', 'auxpow'] },
  'getblocktemplate': { category: 'mining', params: ['template_request'] },
  'getmininginfo': { category: 'mining', params: [] },
  'getnetworkhashps': { category: 'mining', params: ['nblocks', 'height'] },
  'prioritisetransaction': { category: 'mining', params: ['txid', 'dummy', 'fee_delta'] },
  'submitblock': { category: 'mining', params: ['hexdata', 'dummy'] },
  'submitheader': { category: 'mining', params: ['hexdata'] },

  // Network
  'addnode': { category: 'network', params: ['node', 'command'] },
  'clearbanned': { category: 'network', params: [] },
  'disconnectnode': { category: 'network', params: ['address', 'nodeid'] },
  'getaddednodeinfo': { category: 'network', params: ['node'] },
  'getcheckpoint': { category: 'network', params: [] },
  'getconnectioncount': { category: 'network', params: [] },
  'getnettotals': { category: 'network', params: [] },
  'getnetworkinfo': { category: 'network', params: [] },
  'getnodeaddresses': { category: 'network', params: ['count'] },
  'getpeerinfo': { category: 'network', params: [] },
  'listbanned': { category: 'network', params: [] },
  'ping': { category: 'network', params: [] },
  'setban': { category: 'network', params: ['subnet', 'command', 'bantime', 'absolute'] },
  'setnetworkactive': { category: 'network', params: ['state'] },

  // Randpay
  'randpay_accept': { category: 'randpay', params: ['hexstring', 'flags'] },
  'randpay_mkchap': { category: 'randpay', params: ['amount', 'risk', 'timeout'] },
  'randpay_mktx': { category: 'randpay', params: ['chap', 'timeout', 'flags'] },

  // Raw transactions
  'analyzepsbt': { category: 'rawtransactions', params: ['psbt'] },
  'combinepsbt': { category: 'rawtransactions', params: ['psbts'] },
  'combinerawtransaction': { category: 'rawtransactions', params: ['hexstrings'] },
  'converttopsbt': { category: 'rawtransactions', params: ['hexstring', 'permitsigdata', 'iswitness'] },
  'createpsbt': { category: 'rawtransactions', params: ['inputs', 'outputs', 'locktime', 'replaceable'] },
  'createrawtransaction': { category: 'rawtransactions', params: ['inputs', 'outputs', 'locktime', 'replaceable'] },
  'decodepsbt': { category: 'rawtransactions', params: ['psbt'] },
  'decoderawtransaction': { category: 'rawtransactions', params: ['hexstring', 'iswitness'] },
  'decodescript': { category: 'rawtransactions', params: ['hexstring'] },
  'finalizepsbt': { category: 'rawtransactions', params: ['psbt', 'extract'] },
  'fundrawtransaction': { category: 'rawtransactions', params: ['hexstring', 'options', 'iswitness'] },
  'getrawtransaction': { category: 'rawtransactions', params: ['txid', 'verbose', 'blockhash'] },
  'joinpsbts': { category: 'rawtransactions', params: ['psbts'] },
  'sendrawtransaction': { category: 'rawtransactions', params: ['hexstring', 'maxfeerate'] },
  'signrawtransactionwithkey': { category: 'rawtransactions', params: ['hexstring', 'privkeys', 'prevtxs', 'sighashtype'] },
  'testmempoolaccept': { category: 'rawtransactions', params: ['rawtxs', 'maxfeerate'] },
  'utxoupdatepsbt': { category: 'rawtransactions', params: ['psbt', 'descriptors'] },

  // Util
  'createmultisig': { category: 'util', params: ['nrequired', 'keys', 'address_type'] },
  'deriveaddresses': { category: 'util', params: ['descriptor', 'range'] },
  'estimatesmartfee': { category: 'util', params: ['conf_target', 'estimate_mode'] },
  'getdescriptorinfo': { category: 'util', params: ['descriptor'] },
  'signmessagewithprivkey': { category: 'util', params: ['privkey', 'message'] },
  'validateaddress': { category: 'util', params: ['address'] },
  'verifymessage': { category: 'util', params: ['address', 'signature', 'message'] },

  // Wallet
  'abandontransaction': { category: 'wallet', params: ['txid'] },
  'abortrescan': { category: 'wallet', params: [] },
  'addmultisigaddress': { category: 'wallet', params: ['nrequired', 'keys', 'label', 'address_type'] },
  'backupwallet': { category: 'wallet', params: ['destination'] },
  'createwallet': { category: 'wallet', params: ['wallet_name', 'disable_private_keys', 'blank', 'passphrase', 'avoid_reuse'] },
  'dumpprivkey': { category: 'wallet', params: ['address'] },
  'dumpwallet': { category: 'wallet', params: ['filename'] },
  'encryptwallet': { category: 'wallet', params: ['passphrase'] },
  'getaddressesbylabel': { category: 'wallet', params: ['label'] },
  'getaddressinfo': { category: 'wallet', params: ['address'] },
  'getbalance': { category: 'wallet', params: ['dummy', 'minconf', 'include_watchonly', 'avoid_reuse'] },
  'getbalances': { category: 'wallet', params: [] },
  'getnewaddress': { category: 'wallet', params: ['label', 'address_type'] },
  'getrawchangeaddress': { category: 'wallet', params: ['address_type'] },
  'getreceivedbyaddress': { category: 'wallet', params: ['address', 'minconf'] },
  'getreceivedbylabel': { category: 'wallet', params: ['label', 'minconf'] },
  'gettransaction': { category: 'wallet', params: ['txid', 'include_watchonly', 'verbose'] },
  'getunconfirmedbalance': { category: 'wallet', params: [] },
  'getwalletinfo': { category: 'wallet', params: [] },
  'importaddress': { category: 'wallet', params: ['address', 'label', 'rescan', 'p2sh'] },
  'importmulti': { category: 'wallet', params: ['requests', 'options'] },
  'importprivkey': { category: 'wallet', params: ['privkey', 'label', 'rescan'] },
  'importprunedfunds': { category: 'wallet', params: ['rawtransaction', 'txoutproof'] },
  'importpubkey': { category: 'wallet', params: ['pubkey', 'label', 'rescan'] },
  'importwallet': { category: 'wallet', params: ['filename'] },
  'keypoolrefill': { category: 'wallet', params: ['newsize'] },
  'listaddressgroupings': { category: 'wallet', params: [] },
  'listlabels': { category: 'wallet', params: ['purpose'] },
  'listlockunspent': { category: 'wallet', params: [] },
  'listreceivedbyaddress': { category: 'wallet', params: ['minconf', 'include_empty', 'include_watchonly', 'address_filter'] },
  'listreceivedbylabel': { category: 'wallet', params: ['minconf', 'include_empty', 'include_watchonly'] },
  'listsinceblock': { category: 'wallet', params: ['blockhash', 'target_confirmations', 'include_watchonly', 'include_removed'] },
  'listtransactions': { category: 'wallet', params: ['label', 'count', 'skip', 'include_watchonly'] },
  'listunspent': { category: 'wallet', params: ['minconf', 'maxconf', 'addresses', 'include_unsafe', 'query_options'] },
  'listwalletdir': { category: 'wallet', params: [] },
  'listwallets': { category: 'wallet', params: [] },
  'loadwallet': { category: 'wallet', params: ['filename'] },
  'lockunspent': { category: 'wallet', params: ['unlock', 'transactions'] },
  'makekeypair': { category: 'wallet', params: ['prefix'] },
  'removeprunedfunds': { category: 'wallet', params: ['txid'] },
  'rescanblockchain': { category: 'wallet', params: ['start_height', 'stop_height'] },
  'reservebalance': { category: 'wallet', params: ['reserve', 'amount'] },
  'sendmany': { category: 'wallet', params: ['dummy', 'amounts', 'minconf', 'comment', 'subtractfeefrom', 'replaceable', 'conf_target', 'estimate_mode'] },
  'sendtoaddress': { category: 'wallet', params: ['address', 'amount', 'comment', 'comment_to', 'subtractfeefromamount', 'replaceable', 'conf_target', 'estimate_mode', 'avoid_reuse'] },
  'sethdseed': { category: 'wallet', params: ['newkeypool', 'seed'] },
  'setlabel': { category: 'wallet', params: ['address', 'label'] },
  'settxfee': { category: 'wallet', params: ['amount'] },
  'setwalletflag': { category: 'wallet', params: ['flag', 'value'] },
  'signmessage': { category: 'wallet', params: ['address', 'message'] },
  'signrawtransactionwithwallet': { category: 'wallet', params: ['hexstring', 'prevtxs', 'sighashtype'] },
  'unloadwallet': { category: 'wallet', params: ['wallet_name'] },
  'walletcreatefundedpsbt': { category: 'wallet', params: ['inputs', 'outputs', 'locktime', 'options', 'bip32derivs'] },
  'walletlock': { category: 'wallet', params: [] },
  'walletpassphrase': { category: 'wallet', params: ['passphrase', 'timeout', 'mintonly'] },
  'walletpassphrasechange': { category: 'wallet', params: ['oldpassphrase', 'newpassphrase'] },
  'walletprocesspsbt': { category: 'wallet', params: ['psbt', 'sign', 'sighashtype', 'bip32derivs'] },

  // ZMQ
  'getzmqnotifications': { category: 'zmq', params: [] }
};

// List all available endpoints
app.get('/endpoints', (req, res) => {
  const categories = {};
  Object.entries(EMERCOIN_ENDPOINTS).forEach(([method, info]) => {
    if (!categories[info.category]) {
      categories[info.category] = [];
    }
    categories[info.category].push({
      method,
      params: info.params
    });
  });
  res.json(categories);
});

// Generic RPC endpoint handler
app.post('/rpc/:method', async (req, res) => {
  try {
    const method = req.params.method;
    const { params = [], format = false, extractValue = false } = req.body;
    
    if (!EMERCOIN_ENDPOINTS[method]) {
      return res.status(404).json({ 
        error: `Unknown method: ${method}`,
        available: Object.keys(EMERCOIN_ENDPOINTS)
      });
    }
    
    const result = await execEmercoinCli(method, params, { format, extractValue });
    res.json({ method, result });
  } catch (error) {
    res.status(500).json({ 
      error: error.error || error.message || 'RPC call failed',
      stderr: error.stderr || null,
      code: error.code || null
    });
  }
});

// Category-based endpoints
Object.keys(EMERCOIN_ENDPOINTS).forEach(method => {
  const endpoint = EMERCOIN_ENDPOINTS[method];
  const route = `/${endpoint.category}/${method}`;
  
  app.post(route, async (req, res) => {
    try {
      const { params = [], format = false, extractValue = false } = req.body;
      const result = await execEmercoinCli(method, params, { format, extractValue });
      res.json({ method, result });
    } catch (error) {
      res.status(500).json({ 
        error: error.error || error.message || 'RPC call failed',
        stderr: error.stderr || null,
        code: error.code || null
      });
    }
  });
});

// Raw RPC passthrough (legacy compatibility)
app.post('/rpc', async (req, res) => {
  try {
    const { method, params = [], format = false, extractValue = false } = req.body;
    if (!method) {
      return res.status(400).json({ error: 'Method is required' });
    }
    
    const result = await execEmercoinCli(method, params, { format, extractValue });
    res.json({ method, result });
  } catch (error) {
    res.status(500).json({ 
      error: error.error || error.message || 'RPC call failed',
      stderr: error.stderr || null,
      code: error.code || null
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(CONFIG.port, () => {
  console.log(`Emercoin MCP Server v${require('./package.json').version} running on port ${CONFIG.port}`);
  console.log(`Using emercoin-cli at: ${CONFIG.emercoinCliPath}`);
  console.log(`RPC Host: ${CONFIG.rpcHost}:${CONFIG.rpcPort}`);
  console.log(`Available endpoints: ${Object.keys(EMERCOIN_ENDPOINTS).length}`);
  console.log(`API Documentation: http://localhost:${CONFIG.port}/endpoints`);
  console.log(`Health Check: http://localhost:${CONFIG.port}/health`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
