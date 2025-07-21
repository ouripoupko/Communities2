import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import { fetchCommunity } from '../store/slices/communitiesSlice';

export const useUrlData = () => {
  const dispatch = useAppDispatch();
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

  useEffect(() => {
    // If we have a communityId in the URL, fetch that community
    if (communityId) {
      dispatch(fetchCommunity(communityId));
    }
  }, [communityId, dispatch]);

  return { communityId, server, agent, issueId };
}; 