import React, { useState, useEffect } from 'react';
import { MessageSquare, Edit, Save, ChevronDown, ChevronRight, Reply } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { getComments, addComment, setIssueDescription } from '../../store/slices/issuesSlice';
import './Discussion.scss';

interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  children?: Comment[];
  parentId?: string;
  isCollapsed?: boolean;
}

interface DiscussionProps {
  issueId: string;
}

const Discussion: React.FC<DiscussionProps> = ({ issueId }) => {
  const dispatch = useAppDispatch();
  const { issueDetails, issueComments } = useAppSelector((state) => state.issues);
  const currentIssue = issueDetails[issueId];
  const comments = Array.isArray(issueComments[issueId]) ? issueComments[issueId] : [];
  
  // Get description from real issue data
  const getIssueDescription = () => {
    if (!currentIssue || !currentIssue.description) return '';
    return typeof currentIssue.description === 'string' ? currentIssue.description : 
           typeof currentIssue.description === 'object' ? JSON.stringify(currentIssue.description) : 
           '';
  };

  const [description, setDescription] = useState(getIssueDescription());
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isCreator] = useState(true); // Mock: assume current user is creator
  const [isLoadingComments, setIsLoadingComments] = useState(true);

  // Update description when issue data changes
  useEffect(() => {
    setDescription(getIssueDescription());
  }, [currentIssue, getIssueDescription]);

  // Load comments from the contract
  useEffect(() => {
    const loadComments = async () => {
      if (!issueId) return;

      try {
        setIsLoadingComments(true);
        // Get the issue owner's credentials from the URL
        const pathParts = window.location.pathname.split('/');
        const encodedServer = pathParts[2];
        const agent = pathParts[3];
        const server = decodeURIComponent(encodedServer);

        await dispatch(getComments({
          serverUrl: server,
          publicKey: agent,
          contractId: issueId,
        })).unwrap();
      } catch (error) {
        console.error('Failed to load comments:', error);
      } finally {
        setIsLoadingComments(false);
      }
    };

    loadComments();
  }, [issueId, dispatch]);

  const handleSaveDescription = async () => {
    if (!issueId) return;

    try {
      // Get the issue owner's credentials from the URL
      const pathParts = window.location.pathname.split('/');
      const encodedServer = pathParts[2];
      const agent = pathParts[3];
      const server = decodeURIComponent(encodedServer);

      await dispatch(setIssueDescription({
        serverUrl: server,
        publicKey: agent,
        contractId: issueId,
        text: description,
      })).unwrap();
      
      setIsEditingDescription(false);
    } catch (error) {
      console.error('Failed to save description:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !issueId) return;

    try {
      // Get the issue owner's credentials from the URL
      const pathParts = window.location.pathname.split('/');
      const encodedServer = pathParts[2];
      const agent = pathParts[3];
      const server = decodeURIComponent(encodedServer);

      // Create comment object with tree structure
      const comment = {
        id: Date.now().toString(),
        author: 'You', // This could be enhanced to get real user info
        content: newComment,
        createdAt: new Date().toISOString(),
        parentId: null, // Top-level comment
      };

      await dispatch(addComment({
        serverUrl: server,
        publicKey: agent,
        contractId: issueId,
        comment: comment,
      })).unwrap();

      // Reload comments to get the updated list
      await dispatch(getComments({
        serverUrl: server,
        publicKey: agent,
        contractId: issueId,
      }));

      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleReply = async (commentId: string) => {
    if (!replyContent.trim() || !issueId) return;

    try {
      // Get the issue owner's credentials from the URL
      const pathParts = window.location.pathname.split('/');
      const encodedServer = pathParts[2];
      const agent = pathParts[3];
      const server = decodeURIComponent(encodedServer);

      // Create reply comment object
      const reply = {
        id: Date.now().toString(),
        author: 'You', // This could be enhanced to get real user info
        content: replyContent,
        createdAt: new Date().toISOString(),
        parentId: commentId,
      };

      await dispatch(addComment({
        serverUrl: server,
        publicKey: agent,
        contractId: issueId,
        comment: reply,
      })).unwrap();

      // Reload comments to get the updated list
      await dispatch(getComments({
        serverUrl: server,
        publicKey: agent,
        contractId: issueId,
      }));

      setReplyContent('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to add reply:', error);
    }
  };

  // Build comment tree from flat array
  const buildCommentTree = (comments: any[]): Comment[] => {
    const commentMap = new Map();
    const rootComments: Comment[] = [];

    // First pass: create map of all comments
    comments.forEach(comment => {
      commentMap.set(comment.id, {
        ...comment,
        children: [],
        isCollapsed: false,
      });
    });

    // Second pass: build tree structure
    comments.forEach(comment => {
      const commentNode = commentMap.get(comment.id);
      if (comment.parentId && commentMap.has(comment.parentId)) {
        const parent = commentMap.get(comment.parentId);
        parent.children.push(commentNode);
      } else {
        rootComments.push(commentNode);
      }
    });

    return rootComments;
  };

  const commentTree = buildCommentTree(comments as unknown[]);

  const toggleCollapse = (commentId: string) => {
    const updateCollapse = (comments: Comment[]): Comment[] => {
      return comments.map(comment => {
        if (comment.id === commentId) {
          return { ...comment, isCollapsed: !comment.isCollapsed };
        }
        if (comment.children) {
          return {
            ...comment,
            children: updateCollapse(comment.children)
          };
        }
        return comment;
      });
    };

    // Since we're using real data, we'll need to handle collapse state differently
    // For now, we'll just toggle the local state
    // In a real implementation, you might want to store collapse state in localStorage or Redux
  };

  const renderComment = (comment: Comment, level: number = 0) => {
    const isReply = level > 0;
    const hasReplies = comment.children && comment.children.length > 0;

    return (
      <div key={comment.id} className={`comment ${isReply ? 'reply' : ''}`}>
        <div className="comment-header">
          <div className="comment-author">
            <strong>{comment.author}</strong>
            <span className="comment-date">
              {new Date(comment.createdAt).toLocaleDateString()}
            </span>
          </div>
          {hasReplies && (
            <button
              onClick={() => toggleCollapse(comment.id)}
              className="collapse-button"
            >
              {comment.isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
        
        <div className="comment-content">
          <p>{comment.content}</p>
        </div>

        <div className="comment-actions">
          <button
            onClick={() => setReplyingTo(comment.id)}
            className="reply-button"
          >
            <Reply size={14} />
            Reply
          </button>
        </div>

        {replyingTo === comment.id && (
          <div className="reply-form">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write your reply..."
              className="input-field"
              rows={3}
            />
            <div className="reply-actions">
              <button
                onClick={() => handleReply(comment.id)}
                className="save-button"
                disabled={!replyContent.trim()}
              >
                Reply
              </button>
              <button
                onClick={() => {
                  setReplyingTo(null);
                  setReplyContent('');
                }}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {comment.children && !comment.isCollapsed && (
          <div className="comment-replies">
            {comment.children.map(child => renderComment(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="discussion-container">
      <div className="description-section">
        <div className="description-header">
          <h3>Description</h3>
          {isCreator && (
            <button
              onClick={() => setIsEditingDescription(!isEditingDescription)}
              className="edit-button"
            >
              {isEditingDescription ? <Save size={16} /> : <Edit size={16} />}
              {isEditingDescription ? 'Save' : 'Edit'}
            </button>
          )}
        </div>
        
        {isEditingDescription ? (
          <div className="description-edit">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              rows={4}
            />
            <div className="edit-actions">
              <button onClick={handleSaveDescription} className="save-button">
                Save Description
              </button>
              <button
                onClick={() => setIsEditingDescription(false)}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="description-content">
            <p>{description}</p>
          </div>
        )}
      </div>

      <div className="comments-section">
        <div className="comments-header">
          <h3>Comments</h3>
        </div>

        {isLoadingComments ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading comments...</p>
          </div>
        ) : (
          <>
            <div className="add-comment">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="input-field"
                rows={3}
              />
              <button
                onClick={handleAddComment}
                className="add-comment-button"
                disabled={!newComment.trim()}
              >
                <MessageSquare size={16} />
                Add Comment
              </button>
            </div>

            <div className="comments-list">
              {commentTree.map(comment => renderComment(comment))}
            </div>

            {commentTree.length === 0 && !isLoadingComments && (
              <div className="empty-state">
                <MessageSquare size={48} />
                <h3>No Comments Yet</h3>
                <p>Be the first to add a comment to this discussion</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Discussion; 