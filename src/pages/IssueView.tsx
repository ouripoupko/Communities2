import React, { useMemo, useEffect, useState } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, FileText, Vote as VoteIcon, BarChart3, Share2 } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { useAuth } from '../contexts/AuthContext';
import { getIssueDetails, getProposals } from '../store/slices/contractsSlice';
import { eventStreamService } from '../services/eventStream';
import Discussion from '../components/issue/Discussion';
import Proposals from '../components/issue/Proposals';
import Vote from '../components/issue/Vote';
import Outcome from '../components/issue/Outcome';
import Share from '../components/issue/Share';
import '../components/layout/Layout.scss';

const IssueView: React.FC = () => {
  const { server: encodedServer, agent, communityId, issueId } = useParams<{ server: string; agent: string; communityId: string; issueId: string }>();
  const navigate = useNavigate();
  const { issueDetails } = useAppSelector((state: any) => state.contracts);
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const [fetching, setFetching] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  
  // Decode the server URL from the URL parameter
  const server = useMemo(() => {
    return encodedServer ? decodeURIComponent(encodedServer) : '';
  }, [encodedServer]);

  // Get the current issue details
  const currentIssue = issueDetails[issueId!];

  // Handle contract_write events to reload issue details and proposals
  useEffect(() => {
    const handleContractWrite = (event: any) => {
      if (event.contract === issueId && issueId) {
        console.log('Contract write event detected for issue:', issueId);
        // Reload issue details
        dispatch(getIssueDetails({
          serverUrl: server,
          publicKey: agent || '',
          contractId: issueId,
        }));
        // Reload proposals
        dispatch(getProposals({
          serverUrl: server,
          publicKey: agent || '',
          contractId: issueId,
        }));
      }
    };

    // Add event listener for contract_write events
    eventStreamService.addEventListener('contract_write', handleContractWrite);

    // Cleanup event listener on unmount
    return () => {
      eventStreamService.removeEventListener('contract_write', handleContractWrite);
    };
  }, [issueId, server, agent, dispatch]);

  // Validate credentials and load issue data
  useEffect(() => {
    const validateAndLoadIssue = async () => {
      // Check if user credentials are in localStorage for authentication
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        navigate('/');
        return;
      }

      try {
        const storedUser = JSON.parse(userStr);
        if (!storedUser.serverUrl || !storedUser.publicKey) {
          navigate('/');
          return;
        }

        // For issue access, we use the URL credentials (issue owner's credentials)
        // but we validate that the user has their own credentials in localStorage
        if (issueId && !fetching) {
          setFetching(true);
          try {
            // Fetch the issue using the URL credentials (issue owner's server and agent)
            await dispatch(getIssueDetails({
              serverUrl: server,
              publicKey: agent || '',
              contractId: issueId,
            })).unwrap();
            
            // Also load proposals for the issue
            await dispatch(getProposals({
              serverUrl: server,
              publicKey: agent || '',
              contractId: issueId,
            }));
            
            setIsValidated(true);
          } catch (error) {
            console.error('Failed to load issue:', error);
            navigate('/');
          } finally {
            setFetching(false);
          }
        }
      } catch (error) {
        console.error('Failed to validate credentials:', error);
        navigate('/');
      }
    };

    validateAndLoadIssue();
  }, [server, agent, issueId, navigate, dispatch]);

  const navItems = [
    { path: 'discussion', label: 'Discussion', icon: MessageSquare },
    { path: 'proposals', label: 'Proposals', icon: FileText },
    { path: 'vote', label: 'Vote', icon: VoteIcon },
    { path: 'outcome', label: 'Outcome', icon: BarChart3 },
    { path: 'share', label: 'Share', icon: Share2 },
  ];

  if (fetching || !isValidated) {
    return (
      <div className="issue-view-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading issue...</p>
        </div>
      </div>
    );
  }

  if (!currentIssue) {
    return (
      <div className="issue-view-container">
        <div className="error-state">
          <h2>Issue Not Found</h2>
          <p>The issue you're looking for doesn't exist.</p>
          <button onClick={() => navigate(`/community/${communityId}`)} className="back-button">
            Back to Community
          </button>
        </div>
      </div>
    );
  }

  // Handle different possible response structures for issue data
  const issueName = typeof currentIssue.name === 'string' ? currentIssue.name : 
                   typeof currentIssue.name === 'object' ? JSON.stringify(currentIssue.name) : 
                   'Unknown Issue';

  return (
    <div className="issue-view-container">
      <div className="issue-page-header">
        <div className="header-left">
          <button onClick={() => navigate(`/community/${communityId}`)} className="back-button">
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="issue-info">
            <h1>{issueName}</h1>
          </div>
        </div>
      </div>

      <div className="issue-page-content">
        <nav className="issue-page-nav">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(`/issue/${encodeURIComponent(server)}/${agent}/${communityId}/${issueId}/${item.path}`)}
              className={`issue-nav-item ${window.location.pathname.includes(`/issue/${encodeURIComponent(server)}/${agent}/${communityId}/${issueId}/${item.path}`) ? 'active' : ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="issue-page-main">
          <Routes>
            <Route path="discussion" element={<Discussion issueId={issueId!} />} />
            <Route path="proposals" element={<Proposals issueId={issueId!} />} />
            <Route path="vote" element={<Vote issueId={issueId!} />} />
            <Route path="outcome" element={<Outcome issueId={issueId!} />} />
            <Route path="share" element={<Share issueId={issueId!} server={server} agent={agent} communityId={communityId} />} />
            <Route path="*" element={<Discussion issueId={issueId!} />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default IssueView; 