// API service layer - currently returns mock data
// In production, these would make actual REST API calls

export interface Community {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  isOwner: boolean;
  createdAt: string;
}

export interface Issue {
  id: string;
  communityId: string;
  title: string;
  description: string;
  status: 'open' | 'closed' | 'in_progress' | 'voting';
  createdAt: string;
  createdBy: string;
  voteCount: number;
  creatorName?: string;
  proposalCount?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// Mock data
const mockCommunities: Community[] = [
  {
    id: '1',
    name: 'Open Source Contributors',
    description: 'A community for open source developers and contributors',
    memberCount: 156,
    isOwner: true,
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    name: 'Design System Team',
    description: 'Collaborative design system development and maintenance',
    memberCount: 23,
    isOwner: false,
    createdAt: '2024-02-20'
  },
  {
    id: '3',
    name: 'Product Strategy',
    description: 'Product strategy discussions and decision making',
    memberCount: 8,
    isOwner: true,
    createdAt: '2024-03-10'
  }
];

const mockIssues: Issue[] = [
  {
    id: '1',
    communityId: '1',
    title: 'Implement dark mode',
    description: 'Add dark mode support to the application',
    status: 'open',
    createdAt: '2024-01-20',
    createdBy: 'user1',
    voteCount: 15,
    creatorName: 'John Doe',
    proposalCount: 3
  },
  {
    id: '2',
    communityId: '1',
    title: 'Add unit tests',
    description: 'Increase test coverage for critical components',
    status: 'voting',
    createdAt: '2024-01-25',
    createdBy: 'user2',
    voteCount: 8,
    creatorName: 'Jane Smith',
    proposalCount: 5
  },
  {
    id: '3',
    communityId: '2',
    title: 'Update color palette',
    description: 'Refresh the design system color palette',
    status: 'closed',
    createdAt: '2024-02-22',
    createdBy: 'user3',
    voteCount: 12,
    creatorName: 'Mike Johnson',
    proposalCount: 2
  }
];

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Community API functions
export const communityApi = {
  // Fetch all communities for the current user
  async fetchCommunities(): Promise<Community[]> {
    await delay(1000);
    return mockCommunities;
  },

  // Fetch a specific community by ID
  async fetchCommunity(id: string): Promise<Community | null> {
    await delay(500);
    return mockCommunities.find(c => c.id === id) || null;
  },

  // Create a new community
  async createCommunity(data: { name: string; description: string }): Promise<Community> {
    await delay(800);
    const newCommunity: Community = {
      id: Date.now().toString(),
      name: data.name,
      description: data.description,
      memberCount: 1,
      isOwner: true,
      createdAt: new Date().toISOString().split('T')[0]
    };
    mockCommunities.unshift(newCommunity);
    return newCommunity;
  },

  // Update a community
  async updateCommunity(id: string, data: Partial<Community>): Promise<Community> {
    await delay(600);
    const index = mockCommunities.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Community not found');
    
    mockCommunities[index] = { ...mockCommunities[index], ...data };
    return mockCommunities[index];
  },

  // Delete a community
  async deleteCommunity(id: string): Promise<void> {
    await delay(500);
    const index = mockCommunities.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Community not found');
    mockCommunities.splice(index, 1);
  }
};

// Issue API functions
export const issueApi = {
  // Fetch all issues for a community
  async fetchIssues(communityId: string): Promise<Issue[]> {
    await delay(800);
    return mockIssues.filter(issue => issue.communityId === communityId);
  },

  // Fetch a specific issue by ID
  async fetchIssue(id: string): Promise<Issue | null> {
    await delay(500);
    return mockIssues.find(issue => issue.id === id) || null;
  },

  // Create a new issue
  async createIssue(data: { 
    communityId: string; 
    title: string; 
    description: string; 
    createdBy: string;
  }): Promise<Issue> {
    await delay(800);
    const newIssue: Issue = {
      id: Date.now().toString(),
      communityId: data.communityId,
      title: data.title,
      description: data.description,
      status: 'open',
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: data.createdBy,
      voteCount: 0,
      creatorName: 'You',
      proposalCount: 0
    };
    mockIssues.push(newIssue);
    return newIssue;
  },

  // Update an issue
  async updateIssue(id: string, data: Partial<Issue>): Promise<Issue> {
    await delay(600);
    const index = mockIssues.findIndex(issue => issue.id === id);
    if (index === -1) throw new Error('Issue not found');
    
    mockIssues[index] = { ...mockIssues[index], ...data };
    return mockIssues[index];
  },

  // Delete an issue
  async deleteIssue(id: string): Promise<void> {
    await delay(500);
    const index = mockIssues.findIndex(issue => issue.id === id);
    if (index === -1) throw new Error('Issue not found');
    mockIssues.splice(index, 1);
  }
};

// User API functions
export const userApi = {
  // Fetch current user
  async fetchCurrentUser(): Promise<User> {
    await delay(300);
    return {
      id: 'user1',
      name: 'John Doe',
      email: 'john@example.com',
      avatar: 'https://via.placeholder.com/40'
    };
  }
}; 