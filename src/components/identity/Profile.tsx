import React, { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Camera, Save, Key, Server } from 'lucide-react';
import './Profile.scss';

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    updateUser({ firstName, lastName });
    setIsEditing(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        updateUser({ profilePicture: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Profile</h1>
        <p>Manage your personal information and identity</p>
      </div>

      <div className="profile-content">
        <div className="profile-section">
          <div className="profile-picture-section">
            <div className="profile-picture">
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt="Profile" />
              ) : (
                <div className="profile-picture-placeholder">
                  <User size={48} />
                </div>
              )}
              <button
                onClick={triggerFileInput}
                className="upload-button"
                title="Upload profile picture"
              >
                <Camera size={20} />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
          </div>

          <div className="profile-form">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={!isEditing}
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={!isEditing}
                className="input-field"
              />
            </div>

            <div className="form-actions">
              {isEditing ? (
                <>
                  <button onClick={handleSave} className="save-button">
                    <Save size={16} />
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setFirstName(user?.firstName || '');
                      setLastName(user?.lastName || '');
                    }}
                    className="cancel-button"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)} className="edit-button">
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="identity-section">
          <h3>Identity Information</h3>
          <div className="identity-info">
            <div className="info-item">
              <div className="info-label">
                <Key size={16} />
                Public Key
              </div>
              <div className="info-value">
                <code>{user?.publicKey}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(user?.publicKey || '')}
                  className="copy-button"
                  title="Copy to clipboard"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="info-item">
              <div className="info-label">
                <Server size={16} />
                Server URL
              </div>
              <div className="info-value">
                <code>{user?.serverUrl}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(user?.serverUrl || '')}
                  className="copy-button"
                  title="Copy to clipboard"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 