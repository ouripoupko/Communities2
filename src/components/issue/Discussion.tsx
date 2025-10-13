import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MessageSquare, Edit, Save, ChevronDown, ChevronRight, Reply } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { getComments } from '../../store/slices/issuesSlice';
import { contractWrite } from '../../services/api';
import styles from './Discussion.module.scss';

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
  const { issueHostServer: encodedIssueHostServer, issueHostAgent } = useParams<{ issueHostServer: string; issueHostAgent: string }>();
  const dispatch = useAppDispatch();
  const { issueDetails, issueComments, issueProposals } = useAppSelector((state) => state.issues);
  const currentIssue = issueDetails[issueId];
  const comments = Array.isArray(issueComments[issueId]) ? issueComments[issueId] : [];
  const proposals = Array.isArray(issueProposals[issueId]) ? issueProposals[issueId] : [];
  
  // Decode the issue host server URL
  const issueHostServer = encodedIssueHostServer ? decodeURIComponent(encodedIssueHostServer) : '';
  
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
  const { publicKey: userPublicKey } = useAppSelector((state) => state.user);
  const [isCreator] = useState(() => {
    // Check if current user is the issue host
    return userPublicKey === issueHostAgent;
  });
  const [isLoadingComments, setIsLoadingComments] = useState(true);

  // Update description when issue data changes
  useEffect(() => {
    setDescription(getIssueDescription());
  }, [currentIssue, getIssueDescription]);

  // Load comments from the contract
  useEffect(() => {
    const loadComments = async () => {
      if (!issueId || !issueHostServer || !issueHostAgent) return;

      try {
        setIsLoadingComments(true);
        await dispatch(getComments({
          serverUrl: issueHostServer,
          publicKey: issueHostAgent,
          contractId: issueId,
        })).unwrap();
      } catch (error) {
        console.error('Failed to load comments:', error);
      } finally {
        setIsLoadingComments(false);
      }
    };

    loadComments();
  }, [issueId, issueHostServer, issueHostAgent, dispatch]);

  const handleSaveDescription = async () => {
    if (!issueId || !issueHostServer || !issueHostAgent) return;

    try {
      await contractWrite({
        serverUrl: issueHostServer,
        publicKey: issueHostAgent,
        contractId: issueId,
        method: 'set_description',
        args: { text: description },
      });
      
      setIsEditingDescription(false);
    } catch (error) {
      console.error('Failed to save description:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !issueId || !issueHostServer || !issueHostAgent) return;

    try {
      // Create comment object with tree structure
      const comment = {
        id: Date.now().toString(),
        author: 'You', // This could be enhanced to get real user info
        content: newComment,
        createdAt: new Date().toISOString(),
        parentId: null, // Top-level comment
      };

      await contractWrite({
        serverUrl: issueHostServer,
        publicKey: issueHostAgent,
        contractId: issueId,
        method: 'add_comment',
        args: { comment: comment },
      });

      // Reload comments to get the updated list
      await dispatch(getComments({
        serverUrl: issueHostServer,
        publicKey: issueHostAgent,
        contractId: issueId,
      }));

      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleReply = async (commentId: string) => {
    if (!replyContent.trim() || !issueId || !issueHostServer || !issueHostAgent) return;

    try {
      // Create reply comment object
      const reply = {
        id: Date.now().toString(),
        author: 'You', // This could be enhanced to get real user info
        content: replyContent,
        createdAt: new Date().toISOString(),
        parentId: commentId,
      };

      await contractWrite({
        serverUrl: issueHostServer,
        publicKey: issueHostAgent,
        contractId: issueId,
        method: 'add_comment',
        args: { comment: reply },
      });

      // Reload comments to get the updated list
      await dispatch(getComments({
        serverUrl: issueHostServer,
        publicKey: issueHostAgent,
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
      <div key={comment.id} className={`${styles.comment} ${isReply ? styles.reply : ''}`}>
        <div className={styles.commentHeader}>
          <div className={styles.commentAuthor}>
            <strong>{comment.author}</strong>
            <span className={styles.commentDate}>
              {new Date(comment.createdAt).toLocaleDateString()}
            </span>
          </div>
          {hasReplies && (
            <button
              onClick={() => toggleCollapse(comment.id)}
              className={styles.collapseButton}
            >
              {comment.isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
        
        <div className={styles.commentContent}>
          <p>{comment.content}</p>
        </div>

        <div className={styles.commentActions}>
          <button
            onClick={() => setReplyingTo(comment.id)}
            className={styles.replyButton}
          >
            <Reply size={14} />
            Reply
          </button>
        </div>

        {replyingTo === comment.id && (
          <div className={styles.replyForm}>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write your reply..."
              className="input-field"
              rows={3}
            />
            <div className={styles.replyActions}>
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
          <div className={styles.commentReplies}>
            {comment.children.map(child => renderComment(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.descriptionSection}>
        <div className={styles.descriptionHeader}>
          <h3>Description</h3>
          <div className={styles.descriptionMeta}>
            <span className={styles.proposalsCount}>
              {proposals.length} proposal{proposals.length !== 1 ? 's' : ''}
            </span>
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
        </div>
        
        {isEditingDescription ? (
          <div className={styles.descriptionEdit}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              rows={4}
            />
            <div className={styles.editActions}>
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
          <div className={styles.descriptionContent}>
            <p>{description}</p>
          </div>
        )}
      </div>

      <div className={styles.commentsSection}>
        <div className={styles.commentsHeader}>
          <h3>Comments</h3>
        </div>

        {isLoadingComments ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading comments...</p>
          </div>
        ) : (
          <>
            <div className={styles.addComment}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="input-field"
                rows={3}
              />
              <button
                onClick={handleAddComment}
                className={styles.addCommentButton}
                disabled={!newComment.trim()}
              >
                <MessageSquare size={16} />
                Add Comment
              </button>
            </div>

            <div className={styles.commentsList}>
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