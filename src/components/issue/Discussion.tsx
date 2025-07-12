import React, { useState, useEffect } from 'react';
import { MessageSquare, Edit, Save, ChevronDown, ChevronRight, Reply } from 'lucide-react';
import './Discussion.scss';

interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  parentId?: string;
  children?: Comment[];
  isCollapsed?: boolean;
}

interface DiscussionProps {
  issueId: string;
}

const Discussion: React.FC<DiscussionProps> = ({ issueId }) => {
  const [description, setDescription] = useState('We need to implement a more secure authentication system that supports OAuth2 and JWT tokens.');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isCreator] = useState(true); // Mock: assume current user is creator

  useEffect(() => {
    // Mock API call to fetch comments
    const fetchComments = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockComments: Comment[] = [
        {
          id: '1',
          author: 'John Doe',
          content: 'I think we should consider using Auth0 as it provides excellent OAuth2 support out of the box.',
          createdAt: '2024-03-15T10:30:00Z',
          children: [
            {
              id: '1-1',
              author: 'Jane Smith',
              content: 'Auth0 is great but can be expensive for large teams. Have you considered alternatives?',
              createdAt: '2024-03-15T11:00:00Z',
              parentId: '1'
            },
            {
              id: '1-2',
              author: 'Mike Johnson',
              content: 'I agree with John. Auth0 has been working well in our other projects.',
              createdAt: '2024-03-15T11:30:00Z',
              parentId: '1'
            }
          ]
        },
        {
          id: '2',
          author: 'Sarah Wilson',
          content: 'We should also consider implementing MFA for enhanced security.',
          createdAt: '2024-03-15T12:00:00Z'
        }
      ];
      
      setComments(mockComments);
    };

    fetchComments();
  }, [issueId]);

  const handleSaveDescription = () => {
    setIsEditingDescription(false);
    // Mock API call to save description
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      author: 'You',
      content: newComment,
      createdAt: new Date().toISOString(),
    };

    setComments([comment, ...comments]);
    setNewComment('');
  };

  const handleReply = (commentId: string) => {
    if (!replyContent.trim()) return;

    const reply: Comment = {
      id: Date.now().toString(),
      author: 'You',
      content: replyContent,
      createdAt: new Date().toISOString(),
      parentId: commentId,
    };

    // Add reply to the comment's children
    const updateComments = (comments: Comment[]): Comment[] => {
      return comments.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            children: [...(comment.children || []), reply]
          };
        }
        if (comment.children) {
          return {
            ...comment,
            children: updateComments(comment.children)
          };
        }
        return comment;
      });
    };

    setComments(updateComments(comments));
    setReplyContent('');
    setReplyingTo(null);
  };

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

    setComments(updateCollapse(comments));
  };

  const renderComment = (comment: Comment, level: number = 0) => (
    <div key={comment.id} className={`comment ${level > 0 ? 'reply' : ''}`} style={{ marginLeft: `${level * 20}px` }}>
      <div className="comment-header">
        <div className="comment-author">
          <strong>{comment.author}</strong>
          <span className="comment-date">
            {new Date(comment.createdAt).toLocaleDateString()}
          </span>
        </div>
        {comment.children && comment.children.length > 0 && (
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
          onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
          className="reply-button"
        >
          <Reply size={16} />
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
            <button onClick={() => handleReply(comment.id)} className="save-button">
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
          <h3>Discussion</h3>
          <div className="add-comment">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="input-field"
              rows={3}
            />
            <button onClick={handleAddComment} className="add-comment-button">
              <MessageSquare size={16} />
              Add Comment
            </button>
          </div>
        </div>

        <div className="comments-list">
          {comments.map(comment => renderComment(comment))}
        </div>
      </div>
    </div>
  );
};

export default Discussion; 