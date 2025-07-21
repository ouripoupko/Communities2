import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import profileContractCode from "@/assets/contracts/gloki_contract.py?raw";
import communityContractCode from "@/assets/contracts/community_contract.py?raw";
import issueContractCode from "@/assets/contracts/issue_contract.py?raw";

export interface IContract {
  id: string;
  name: string;
  contract: string;
  code: string;
  protocol: string;
  default_app: string;
  pid: string;
  address: string;
  group: string[];
  threshold: number;
  profile: string | null;
  constructor: any;
}

export interface IMethod {
  name: string;
  arguments: string[];
  values: any;
  parameters: any;
}

export interface IProfile {
  firstName: string;
  lastName: string;
  userPhoto: string;
  userBio: string;
}

// Profile contract unique name
export const PROFILE_CONTRACT_NAME = "unique-gloki-communities-profile-contract";

// Community contract unique name
export const COMMUNITY_CONTRACT_NAME = "unique-gloki-communities-community-contract";

interface ContractsState {
  contracts: IContract[];
  profile: IProfile | null;
  loading: boolean;
  error: string | null;
  communityProperties: Record<string, any>; // Add this line
  communityMembers: Record<string, any[]>; // Add this line for member lists
  communityIssues: Record<string, any[]>; // Add this line for issues
  issueDetails: Record<string, any>; // Add this line for issue details
  issueComments: Record<string, any[]>; // Add this line for issue comments
  issueProposals: Record<string, any[]>; // Add this line for issue proposals
}

const initialState: ContractsState = {
  contracts: [],
  profile: null,
  loading: false,
  error: null,
  communityProperties: {}, // Add this line
  communityMembers: {}, // Add this line
  communityIssues: {}, // Add this line
  issueDetails: {}, // Add this line
  issueComments: {}, // Add this line
  issueProposals: {}, // Add this line
};

// Custom error class for API errors
export class APIError extends Error {
  public statusCode?: number;
  public isNetworkError: boolean;
  public isInvalidServer: boolean;

  constructor(
    message: string,
    statusCode?: number,
    isNetworkError: boolean = false,
    isInvalidServer: boolean = false
  ) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.isNetworkError = isNetworkError;
    this.isInvalidServer = isInvalidServer;
  }
}

// Helper function to create fetch with timeout
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout: number = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Helper function to determine error type
const createAPIError = (error: any, operation: string): APIError => {
  if (error.name === 'AbortError') {
    // Timeout error
    return new APIError(
      `Request timed out. The server is not responding. Please check if the server is running and the URL is correct.`,
      undefined,
      true,
      false
    );
  }
  
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    // Network error - server is down or unreachable
    return new APIError(
      `Unable to connect to the server. Please check if the server is running and the URL is correct.`,
      undefined,
      true,
      false
    );
  }
  
  if (error.statusCode === 404 || error.statusCode === 405) {
    // Server responded but doesn't recognize the API
    return new APIError(
      `The server doesn't recognize the API endpoints. Please check if this is the correct server URL.`,
      error.statusCode,
      false,
      true
    );
  }
  
  // Other HTTP errors
  return new APIError(
    `${operation} failed: ${error.message || 'Unknown error'}`,
    error.statusCode,
    false,
    false
  );
};

// Async thunks
export const checkAgentExists = createAsyncThunk(
  'contracts/checkAgentExists',
  async ({ serverUrl, publicKey }: { serverUrl: string; publicKey: string }) => {
    try {
      const response = await fetchWithTimeout(`${serverUrl}/ibc/app/${publicKey}?action=is_exist_agent`);
      
      if (!response.ok) {
        throw createAPIError(
          { statusCode: response.status, message: response.statusText },
          'Checking agent existence'
        );
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw createAPIError(error, 'Checking agent existence');
    }
  }
);

export const registerAgent = createAsyncThunk(
  'contracts/registerAgent',
  async ({ serverUrl, publicKey }: { serverUrl: string; publicKey: string }) => {
    try {
      const response = await fetchWithTimeout(`${serverUrl}/ibc/app/${publicKey}?action=register_agent`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: serverUrl }),
      });
      
      if (!response.ok) {
        throw createAPIError(
          { statusCode: response.status, message: response.statusText },
          'Registering agent'
        );
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw createAPIError(error, 'Registering agent');
    }
  }
);

export const fetchContracts = createAsyncThunk(
  'contracts/fetchContracts',
  async ({ serverUrl, publicKey }: { serverUrl: string; publicKey: string }) => {
    try {
      const response = await fetchWithTimeout(`${serverUrl}/ibc/app/${publicKey}?action=get_contracts`);
      
      if (!response.ok) {
        throw createAPIError(
          { statusCode: response.status, message: response.statusText },
          'Fetching contracts'
        );
      }
      
      const data = await response.json();
      return data as IContract[];
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw createAPIError(error, 'Fetching contracts');
    }
  }
);

export const deployProfileContract = createAsyncThunk(
  'contracts/deployProfileContract',
  async ({ serverUrl, publicKey }: { serverUrl: string; publicKey: string }) => {
    try {
      const profileContract: IContract = {
        id: "",
        name: PROFILE_CONTRACT_NAME,
        contract: "gloki_contract.py",
        code: profileContractCode,
        protocol: "BFT",
        default_app: "",
        pid: publicKey,
        address: serverUrl,
        group: [],
        threshold: 0,
        profile: null,
        constructor: {}
      };

      const response = await fetchWithTimeout(`${serverUrl}/ibc/app/${publicKey}?action=deploy_contract`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileContract),
      });
      
      if (!response.ok) {
        throw createAPIError(
          { statusCode: response.status, message: response.statusText },
          'Deploying profile contract'
        );
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw createAPIError(error, 'Deploying profile contract');
    }
  }
);

export const readProfile = createAsyncThunk(
  'contracts/readProfile',
  async ({ serverUrl, publicKey, contractId }: { serverUrl: string; publicKey: string; contractId: string }) => {
    try {
      const method: IMethod = {
        name: "get_profile",
        values: {},
      } as IMethod;

      const response = await fetchWithTimeout(`${serverUrl}/ibc/app/${publicKey}/${contractId}/get_profile?action=contract_read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(method),
      });
      
      if (!response.ok) {
        throw createAPIError(
          { statusCode: response.status, message: response.statusText },
          'Reading profile'
        );
      }
      
      const data = await response.json();
      return data as IProfile;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw createAPIError(error, 'Reading profile');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'contracts/updateProfile',
  async ({ serverUrl, publicKey, contractId, profileData }: { 
    serverUrl: string; 
    publicKey: string; 
    contractId: string; 
    profileData: Partial<IProfile>;
  }) => {
    try {
      const method: IMethod = {
        name: "set_values",
        values: {items: profileData},
      } as IMethod;

      const response = await fetchWithTimeout(`${serverUrl}/ibc/app/${publicKey}/${contractId}/set_values?action=contract_write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(method),
      });
      
      if (!response.ok) {
        throw createAPIError(
          { statusCode: response.status, message: response.statusText },
          'Updating profile'
        );
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw createAPIError(error, 'Updating profile');
    }
  }
);

export const deployCommunityContract = createAsyncThunk(
  'contracts/deployCommunityContract',
  async ({ serverUrl, publicKey }: { serverUrl: string; publicKey: string }) => {
    try {
      const communityContract: IContract = {
        id: "",
        name: COMMUNITY_CONTRACT_NAME,
        contract: "community_contract.py",
        code: communityContractCode,
        protocol: "BFT",
        default_app: "",
        pid: publicKey,
        address: serverUrl,
        group: [],
        threshold: 0,
        profile: null,
        constructor: {}
      };

      const response = await fetchWithTimeout(`${serverUrl}/ibc/app/${publicKey}?action=deploy_contract`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(communityContract),
      });
      
      if (!response.ok) {
        throw createAPIError(
          { statusCode: response.status, message: response.statusText },
          'Deploying community contract'
        );
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw createAPIError(error, 'Deploying community contract');
    }
  }
);

export const readCommunityProperties = createAsyncThunk(
  'contracts/readCommunityProperties',
  async ({ serverUrl, publicKey, contractId }: { serverUrl: string; publicKey: string; contractId: string }) => {
    try {
      const method: IMethod = {
        name: "get_properties",
        values: {},
      } as IMethod;

      const response = await fetchWithTimeout(`${serverUrl}/ibc/app/${publicKey}/${contractId}/get_properties?action=contract_read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(method),
      });
      
      if (!response.ok) {
        throw createAPIError(
          { statusCode: response.status, message: response.statusText },
          'Reading community properties'
        );
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw createAPIError(error, 'Reading community properties');
    }
  }
);

export const setCommunityProperty = createAsyncThunk(
  'contracts/setCommunityProperty',
  async ({ serverUrl, publicKey, contractId, key, value }: { 
    serverUrl: string; 
    publicKey: string; 
    contractId: string; 
    key: string;
    value: any;
  }) => {
    try {
      const method: IMethod = {
        name: "set_property",
        values: { key, value },
      } as IMethod;

      const response = await fetchWithTimeout(`${serverUrl}/ibc/app/${publicKey}/${contractId}/set_property?action=contract_write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(method),
      });
      
      if (!response.ok) {
        throw createAPIError(
          { statusCode: response.status, message: response.statusText },
          'Setting community property'
        );
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw createAPIError(error, 'Setting community property');
    }
  }
);

export const getCommunityMembers = createAsyncThunk(
  'contracts/getCommunityMembers',
  async ({ serverUrl, publicKey, contractId }: { serverUrl: string; publicKey: string; contractId: string }) => {
    try {
      const method: IMethod = {
        name: "get_members",
        values: {},
      } as IMethod;

      const response = await fetchWithTimeout(`${serverUrl}/ibc/app/${publicKey}/${contractId}/get_members?action=contract_read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(method),
      });
      
      if (!response.ok) {
        throw createAPIError(
          { statusCode: response.status, message: response.statusText },
          'Getting community members'
        );
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw createAPIError(error, 'Getting community members');
    }
  }
);

export const deployIssueContract = createAsyncThunk(
  'contracts/deployIssueContract',
  async ({ serverUrl, publicKey }: { serverUrl: string; publicKey: string }) => {
    try {
      const issueContract: IContract = {
        id: "",
        name: "unique-gloki-communities-issue-contract",
        contract: "issue_contract.py",
        code: issueContractCode,
        protocol: "BFT",
        default_app: "",
        pid: publicKey,
        address: serverUrl,
        group: [],
        threshold: 0,
        profile: null,
        constructor: {}
      };

      const response = await fetchWithTimeout(`${serverUrl}/ibc/app/${publicKey}?action=deploy_contract`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(issueContract),
      });
      
      if (!response.ok) {
        throw createAPIError(
          { statusCode: response.status, message: response.statusText },
          'Deploying issue contract'
        );
      }
      
      const data = await response.json();
      return data; // This is the contract id
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw createAPIError(error, 'Deploying issue contract');
    }
  }
);

export const addIssueToCommunity = createAsyncThunk(
  'contracts/addIssueToCommunity',
  async ({ serverUrl, publicKey, contractId, issue }: {
    serverUrl: string;
    publicKey: string;
    contractId: string;
    issue: { server: string; agent: string; contract: string };
  }) => {
    try {
      const method: IMethod = {
        name: 'add_issue',
        values: { issue },
      } as IMethod;
      const response = await fetchWithTimeout(`${serverUrl}/ibc/app/${publicKey}/${contractId}/add_issue?action=contract_write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(method),
      });
      if (!response.ok) {
        throw createAPIError(
          { statusCode: response.status, message: response.statusText },
          'Adding issue to community'
        );
      }
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw createAPIError(error, 'Adding issue to community');
    }
  }
);

export const setIssueProperties = createAsyncThunk(
  'contracts/setIssueProperties',
  async ({ serverUrl, publicKey, contractId, name, text }: {
    serverUrl: string;
    publicKey: string;
    contractId: string;
    name: string;
    text: string;
  }) => {
    try {
      const method: IMethod = {
        name: 'set_issue',
        arguments: ['name', 'text'],
        values: { name, text },
      } as IMethod;
      
      const response = await fetchWithTimeout(`${serverUrl}/ibc/app/${publicKey}/${contractId}/set_issue?action=contract_write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(method),
      });
      
      if (!response.ok) {
        throw createAPIError(
          { statusCode: response.status, message: response.statusText },
          'Setting issue properties'
        );
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw createAPIError(error, 'Setting issue properties');
    }
  }
);

export const getIssueDetails = createAsyncThunk(
  'contracts/getIssueDetails',
  async ({ serverUrl, publicKey, contractId }: {
    serverUrl: string;
    publicKey: string;
    contractId: string;
  }) => {
    try {
      const method: IMethod = {
        name: 'get_issue',
        values: {},
      } as IMethod;
      
      const response = await fetchWithTimeout(`${serverUrl}/ibc/app/${publicKey}/${contractId}/get_issue?action=contract_read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(method),
      });
      
      if (!response.ok) {
        throw createAPIError(
          { statusCode: response.status, message: response.statusText },
          'Getting issue details'
        );
      }
      
      const data = await response.json();
      return { contractId, details: data };
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw createAPIError(error, 'Getting issue details');
    }
  }
);

export const setIssueDescription = createAsyncThunk(
  'contracts/setIssueDescription',
  async ({ serverUrl, publicKey, contractId, text }: {
    serverUrl: string;
    publicKey: string;
    contractId: string;
    text: string;
  }) => {
    try {
      const method: IMethod = {
        name: 'set_description',
        values: { text },
      } as IMethod;
      
      const response = await fetchWithTimeout(`${serverUrl}/ibc/app/${publicKey}/${contractId}/set_description?action=contract_write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(method),
      });
      
      if (!response.ok) {
        throw createAPIError(
          { statusCode: response.status, message: response.statusText },
          'Setting issue description'
        );
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw createAPIError(error, 'Setting issue description');
    }
  }
);

export const addComment = createAsyncThunk(
  'contracts/addComment',
  async ({ serverUrl, publicKey, contractId, comment }: {
    serverUrl: string;
    publicKey: string;
    contractId: string;
    comment: any;
  }) => {
    try {
      const method: IMethod = {
        name: 'add_comment',
        values: { comment },
      } as IMethod;
      
      const response = await fetchWithTimeout(`${serverUrl}/ibc/app/${publicKey}/${contractId}/add_comment?action=contract_write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(method),
      });
      
      if (!response.ok) {
        throw createAPIError(
          { statusCode: response.status, message: response.statusText },
          'Adding comment'
        );
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw createAPIError(error, 'Adding comment');
    }
  }
);

export const getComments = createAsyncThunk(
  'contracts/getComments',
  async ({ serverUrl, publicKey, contractId }: {
    serverUrl: string;
    publicKey: string;
    contractId: string;
  }) => {
    try {
      const method: IMethod = {
        name: 'get_comments',
        values: {},
      } as IMethod;
      
      const response = await fetchWithTimeout(`${serverUrl}/ibc/app/${publicKey}/${contractId}/get_comments?action=contract_read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(method),
      });
      
      if (!response.ok) {
        throw createAPIError(
          { statusCode: response.status, message: response.statusText },
          'Getting comments'
        );
      }
      
      const data = await response.json();
      return { contractId, comments: data };
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw createAPIError(error, 'Getting comments');
    }
  }
);

export const addProposal = createAsyncThunk(
  'contracts/addProposal',
  async ({ serverUrl, publicKey, contractId, proposal }: {
    serverUrl: string;
    publicKey: string;
    contractId: string;
    proposal: any;
  }) => {
    try {
      const method: IMethod = {
        name: 'add_proposal',
        values: { proposal },
      } as IMethod;
      
      const response = await fetchWithTimeout(`${serverUrl}/ibc/app/${publicKey}/${contractId}/add_proposal?action=contract_write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(method),
      });
      
      if (!response.ok) {
        throw createAPIError(
          { statusCode: response.status, message: response.statusText },
          'Adding proposal'
        );
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw createAPIError(error, 'Adding proposal');
    }
  }
);

export const getProposals = createAsyncThunk(
  'contracts/getProposals',
  async ({ serverUrl, publicKey, contractId }: {
    serverUrl: string;
    publicKey: string;
    contractId: string;
  }) => {
    try {
      const method: IMethod = {
        name: 'get_proposals',
        values: {},
      } as IMethod;
      
      const response = await fetchWithTimeout(`${serverUrl}/ibc/app/${publicKey}/${contractId}/get_proposals?action=contract_read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(method),
      });
      
      if (!response.ok) {
        throw createAPIError(
          { statusCode: response.status, message: response.statusText },
          'Getting proposals'
        );
      }
      
      const data = await response.json();
      return { contractId, proposals: data };
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw createAPIError(error, 'Getting proposals');
    }
  }
);

export const getCommunityIssues = createAsyncThunk(
  'contracts/getCommunityIssues',
  async ({ serverUrl, publicKey, contractId }: { serverUrl: string; publicKey: string; contractId: string }) => {
    try {
      const method: IMethod = {
        name: 'get_issues',
        values: {},
      } as IMethod;
      const response = await fetchWithTimeout(`${serverUrl}/ibc/app/${publicKey}/${contractId}/get_issues?action=contract_read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(method),
      });
      if (!response.ok) {
        throw createAPIError(
          { statusCode: response.status, message: response.statusText },
          'Getting community issues'
        );
      }
      const data = await response.json();
      
      // For each issue, get its details from the issue contract
      const issuesWithDetails = await Promise.all(
        data.map(async (issue: any) => {
          try {
            // Use the credentials stored in the community contract's issue list
            const response = await fetchWithTimeout(`${issue.server}/ibc/app/${issue.agent}/${issue.contract}/get_issue?action=contract_read`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: 'get_issue',
                values: {},
              }),
            });
            
            if (!response.ok) {
              throw new Error(`Failed to get issue details: ${response.statusText}`);
            }
            
            const issueDetails = await response.json();
            
            // Handle different possible response structures
            let name = issueDetails.name;
            let description = issueDetails.description;
            
            // Ensure we have string values
            name = typeof name === 'string' ? name : 
                   typeof name === 'object' ? JSON.stringify(name) : 
                   'Unknown Issue';
            description = typeof description === 'string' ? description : 
                        typeof description === 'object' ? JSON.stringify(description) : 
                        '';
            
            return {
              ...issue,
              name,
              description,
            };
          } catch (error) {
            console.error(`Failed to get details for issue ${issue.contract}:`, error);
            return {
              ...issue,
              name: 'Unknown Issue',
              description: 'Failed to load description',
            };
          }
        })
      );
      
      return issuesWithDetails;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw createAPIError(error, 'Getting community issues');
    }
  }
);

const contractsSlice = createSlice({
  name: 'contracts',
  initialState,
  reducers: {
    clearContracts: (state) => {
      state.contracts = [];
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Check agent exists
    builder
      .addCase(checkAgentExists.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkAgentExists.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(checkAgentExists.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to check agent existence';
      });

    // Register agent
    builder
      .addCase(registerAgent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerAgent.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(registerAgent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to register agent';
      });

    // Fetch contracts
    builder
      .addCase(fetchContracts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContracts.fulfilled, (state, action) => {
        state.loading = false;
        state.contracts = action.payload;
      })
      .addCase(fetchContracts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch contracts';
      });

    // Deploy profile contract
    builder
      .addCase(deployProfileContract.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deployProfileContract.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(deployProfileContract.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to deploy profile contract';
      });

    // Read profile
    builder
      .addCase(readProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(readProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(readProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to read profile';
      });

    // Update profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update profile';
      });

    // Deploy community contract
    builder
      .addCase(deployCommunityContract.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deployCommunityContract.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(deployCommunityContract.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to deploy community contract';
      });

    // Read community properties
    builder
      .addCase(readCommunityProperties.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(readCommunityProperties.fulfilled, (state, action) => {
        state.loading = false;
        // Store properties by contractId
        const contractId = action.meta.arg.contractId;
        state.communityProperties[contractId] = action.payload;
      })
      .addCase(readCommunityProperties.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to read community properties';
      });

    // Set community property
    builder
      .addCase(setCommunityProperty.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(setCommunityProperty.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(setCommunityProperty.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to set community property';
      });

    // Get community members
    builder
      .addCase(getCommunityMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCommunityMembers.fulfilled, (state, action) => {
        state.loading = false;
        // Log the return value to console as requested
        // console.log('[getCommunityMembers] Return value:', action.payload);
        // Store the member list by contractId
        const contractId = action.meta.arg.contractId;
        state.communityMembers[contractId] = action.payload;
      })
      .addCase(getCommunityMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to get community members';
      });

    // Deploy issue contract
    builder
      .addCase(deployIssueContract.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deployIssueContract.fulfilled, (state, action) => {
        state.loading = false;
        // The action payload is the contract id, so we don't need to store it in state.
      })
      .addCase(deployIssueContract.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to deploy issue contract';
      });

    // Add issue to community
    builder
      .addCase(addIssueToCommunity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addIssueToCommunity.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addIssueToCommunity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to add issue to community';
      });

    // Set issue properties
    builder
      .addCase(setIssueProperties.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(setIssueProperties.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(setIssueProperties.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to set issue properties';
      });

    // Get issue details
    builder
      .addCase(getIssueDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getIssueDetails.fulfilled, (state, action) => {
        state.loading = false;
        // Store issue details by contractId
        const contractId = action.payload.contractId;
        state.issueDetails[contractId] = action.payload.details;
      })
      .addCase(getIssueDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to get issue details';
      });

    // Set issue description
    builder
      .addCase(setIssueDescription.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(setIssueDescription.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(setIssueDescription.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to set issue description';
      });

    // Add comment
    builder
      .addCase(addComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addComment.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to add comment';
      });

         // Get comments
     builder
       .addCase(getComments.pending, (state) => {
         state.loading = true;
         state.error = null;
       })
       .addCase(getComments.fulfilled, (state, action) => {
         state.loading = false;
         // Store comments by contractId
         const contractId = action.payload.contractId;
         state.issueComments[contractId] = action.payload.comments;
       })
       .addCase(getComments.rejected, (state, action) => {
         state.loading = false;
         state.error = action.error.message || 'Failed to get comments';
       });

    // Add proposal
    builder
      .addCase(addProposal.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addProposal.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addProposal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to add proposal';
      });

         // Get proposals
     builder
       .addCase(getProposals.pending, (state) => {
         state.loading = true;
         state.error = null;
       })
       .addCase(getProposals.fulfilled, (state, action) => {
         state.loading = false;
         // Store proposals by contractId
         const contractId = action.payload.contractId;
         state.issueProposals[contractId] = action.payload.proposals;
       })
       .addCase(getProposals.rejected, (state, action) => {
         state.loading = false;
         state.error = action.error.message || 'Failed to get proposals';
       });

    // Get community issues
    builder
      .addCase(getCommunityIssues.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCommunityIssues.fulfilled, (state, action) => {
        state.loading = false;
        const contractId = action.meta.arg.contractId;
        state.communityIssues[contractId] = action.payload;
      })
      .addCase(getCommunityIssues.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to get community issues';
      });
  },
});

export const { clearContracts, clearError } = contractsSlice.actions;
export default contractsSlice.reducer; 