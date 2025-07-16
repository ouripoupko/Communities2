const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

// Enable CORS
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Store mock data
const agents = new Map();
const contracts = new Map();

// Mock agent data
const mockAgent = {
  publicKey: 'test-agent-123',
  serverUrl: 'http://localhost:3001',
  profile: {
    firstName: 'John',
    lastName: 'Doe',
    userPhoto: '',
    userBio: 'Test user bio'
  }
};

// Initialize with some test data
agents.set('test-agent-123', mockAgent);
contracts.set('test-agent-123', [
  {
    id: 'unique-gloki-communities-profile-contract',
    name: 'unique-gloki-communities-profile-contract',
    contract: 'gloki_contract.py',
    code: 'class Profile: ...',
    protocol: 'BFT',
    default_app: '',
    pid: 'test-agent-123',
    address: 'http://localhost:3001',
    group: [],
    threshold: 0,
    profile: null,
    constructor: {}
  }
]);

// Helper function to get agent contracts
function getAgentContracts(agentId) {
  return contracts.get(agentId) || [];
}

// Helper function to get agent profile
function getAgentProfile(agentId) {
  const agent = agents.get(agentId);
  return agent ? agent.profile : null;
}

// API Endpoints

// Check if agent exists
app.get('/ibc/app/:agent', (req, res) => {
  const { agent } = req.params;
  const { action } = req.query;

  if (action === 'is_exist_agent') {
    const exists = agents.has(agent);
    res.json({ exists });
  } else if (action === 'get_contracts') {
    const agentContracts = getAgentContracts(agent);
    res.json(agentContracts);
  } else {
    res.status(404).json({ error: 'Action not found' });
  }
});

// Register agent
app.put('/ibc/app/:agent', (req, res) => {
  const { agent } = req.params;
  const { action } = req.query;

  if (action === 'register_agent') {
    const { address } = req.body;
    
    // Create new agent
    agents.set(agent, {
      publicKey: agent,
      serverUrl: address,
      profile: {
        firstName: '',
        lastName: '',
        userPhoto: '',
        userBio: ''
      }
    });
    
    // Initialize empty contracts
    contracts.set(agent, []);
    
    res.json({ success: true, message: 'Agent registered successfully' });
  } else if (action === 'deploy_contract') {
    const contract = req.body;
    const agentContracts = getAgentContracts(agent);
    
    // Add the new contract
    agentContracts.push(contract);
    contracts.set(agent, agentContracts);
    
    res.json({ success: true, message: 'Contract deployed successfully' });
  } else {
    res.status(404).json({ error: 'Action not found' });
  }
});

// Contract operations
app.post('/ibc/app/:agent/:contract/:method', (req, res) => {
  const { agent, contract, method } = req.params;
  const { action } = req.query;

  if (action === 'contract_read') {
    if (contract === 'unique-gloki-communities-profile-contract') {
      if (method === 'get_profile') {
        const profile = getAgentProfile(agent);
        res.json(profile);
      } else if (method === 'set_values') {
        const { values } = req.body;
        const agentData = agents.get(agent);
        
        if (agentData) {
          agentData.profile = { ...agentData.profile, ...values };
          agents.set(agent, agentData);
          res.json({ success: true, message: 'Profile updated successfully' });
        } else {
          res.status(404).json({ error: 'Agent not found' });
        }
      } else {
        res.status(404).json({ error: 'Method not found' });
      }
    } else {
      res.status(404).json({ error: 'Contract not found' });
    }
  } else {
    res.status(404).json({ error: 'Action not found' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Mock server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock server running at http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /ibc/app/{agent}?action=is_exist_agent`);
  console.log(`   GET  /ibc/app/{agent}?action=get_contracts`);
  console.log(`   PUT  /ibc/app/{agent}?action=register_agent`);
  console.log(`   PUT  /ibc/app/{agent}?action=deploy_contract`);
  console.log(`   POST /ibc/app/{agent}/{contract}/{method}?action=contract_read`);
  console.log(`   GET  /health`);
  console.log(`\n🧪 Test with:`);
  console.log(`   Server URL: http://localhost:3001`);
  console.log(`   Public Key: test-agent-123`);
});

module.exports = app; 