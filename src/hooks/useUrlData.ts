import { useMemo } from 'react';
import { useParams } from 'react-router-dom';


export const useUrlData = () => {
  const { communityId, server: encodedServer, agent, issueId } = useParams<{ 
    communityId?: string; 
    server?: string; 
    agent?: string; 
    issueId?: string 
  }>();

  // Decode the server URL from the URL parameter
  const server = useMemo(() => {
    return encodedServer ? decodeURIComponent(encodedServer) : '';
  }, [encodedServer]);



  return { communityId, server, agent, issueId };
}; 