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
    // Optional field for storing per-user AI configuration (e.g. OpenAI API key)
    // This is read from the gloki/profile contract as a simple key-value.
    openaiApiKey?: string;
  }

  export interface IPartner {
    address: string;
    agent: string;
    profile: string;
  }
