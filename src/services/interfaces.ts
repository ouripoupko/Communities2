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
    constructor: Record<string, unknown>;
  }

  export interface IMethod {
    name: string;
    arguments?: string[];
    values?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
  }
  
  export interface IProfile {
    firstName: string;
    lastName: string;
    userPhoto: string;
    userBio: string;
  }

  export interface IPartner {
    address: string;
    agent: string;
    profile: string;
  }
