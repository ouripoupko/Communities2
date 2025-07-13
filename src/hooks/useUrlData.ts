import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import { fetchCommunity } from '../store/slices/communitiesSlice';
import { fetchIssue } from '../store/slices/issuesSlice';

export const useUrlData = () => {
  const dispatch = useAppDispatch();
  const { communityId, issueId } = useParams<{ communityId?: string; issueId?: string }>();

  useEffect(() => {
    // If we have a communityId in the URL, fetch that community
    if (communityId) {
      dispatch(fetchCommunity(communityId));
    }
  }, [communityId, dispatch]);

  useEffect(() => {
    // If we have an issueId in the URL, fetch that issue
    if (issueId) {
      dispatch(fetchIssue(issueId));
    }
  }, [issueId, dispatch]);

  return { communityId, issueId };
}; 