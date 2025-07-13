import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { readProfile, updateProfile, PROFILE_CONTRACT_NAME } from '../../store/slices/contractsSlice';
import { User, Camera, Save, Key, Server } from 'lucide-react';
import './Profile.scss';

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const dispatch = useAppDispatch();
  const { contracts, profile, loading, error } = useAppSelector((state) => state.contracts);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [tempImageData, setTempImageData] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load profile from contract when component mounts or contracts change
  useEffect(() => {
    if (user && contracts.length > 0) {
      const profileContract = contracts.find(contract => contract.name === PROFILE_CONTRACT_NAME);
      if (profileContract) {
        dispatch(readProfile({
          serverUrl: user.serverUrl,
          publicKey: user.publicKey,
          contractId: profileContract.id
        }));
      }
    }
  }, [user, contracts, dispatch]);

  // Update local state when profile is loaded
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      setImageUploadError(null); // Clear any previous image upload errors
      setTempImageData(null); // Clear any temporary image data
    }
  }, [profile]);

  // Helper function to resize image
  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Set maximum dimensions for profile picture
        const maxSize = 200;
        let { width, height } = img;
        
        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to data URL with reduced quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleSave = async () => {
    if (user && contracts.length > 0) {
      const profileContract = contracts.find(contract => contract.name === PROFILE_CONTRACT_NAME);
      if (profileContract) {
        try {
          setSaveError(null);
          
          // Prepare profile data including image if uploaded
          const profileData: any = {
            firstName,
            lastName
          };
          
          // Include image data if a new image was uploaded
          if (tempImageData) {
            profileData.userPhoto = tempImageData;
          }
          
          await dispatch(updateProfile({
            serverUrl: user.serverUrl,
            publicKey: user.publicKey,
            contractId: profileContract.id,
            profileData
          })).unwrap();
          
          // Refresh the profile data from the contract
          await dispatch(readProfile({
            serverUrl: user.serverUrl,
            publicKey: user.publicKey,
            contractId: profileContract.id
          })).unwrap();
          
          setIsEditing(false);
          setTempImageData(null); // Clear temporary image data after successful save
        } catch (error) {
          console.error('Failed to save profile:', error);
          setSaveError('Failed to save profile. Please check your connection and try again.');
        }
      }
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        setImageUploadError(null);
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          setImageUploadError('Please select a valid image file.');
          return;
        }
        
        // Validate file size (max 5MB before processing)
        if (file.size > 5 * 1024 * 1024) {
          setImageUploadError('Image file is too large. Please select a smaller image.');
          return;
        }
        
        // Resize and compress the image
        const resizedImageData = await resizeImage(file);
        
        // Store the processed image data temporarily (not saved to server yet)
        setTempImageData(resizedImageData);
        
      } catch (error) {
        console.error('Failed to process image:', error);
        setImageUploadError('Failed to process image. Please try again.');
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-message">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-container">
        <div className="error-message">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <div className="error-title">Connection Error</div>
            <div className="error-description">{error}</div>
            <div className="error-help">
              Please make sure the server is running and try refreshing the page.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Profile</h1>
        <p>Manage your personal information and identity</p>
        {profile && (
          <div className="profile-name">
            {profile.firstName} {profile.lastName}
          </div>
        )}
      </div>

      <div className="profile-content">
        <div className="profile-section">
          <div className="profile-picture-section">
            <div className="profile-picture">
              {(tempImageData || profile?.userPhoto) ? (
                <img src={tempImageData || profile?.userPhoto} alt="Profile" />
              ) : (
                <div className="profile-picture-placeholder">
                  <User size={48} />
                </div>
              )}
              {imageUploadError && (
                <div className="image-upload-error">
                  <div className="error-icon">⚠️</div>
                  <div className="error-content">
                    <div className="error-title">Upload Error</div>
                    <div className="error-description">{imageUploadError}</div>
                  </div>
                </div>
              )}
              {isEditing && (
                <button
                  onClick={triggerFileInput}
                  className="upload-button"
                  title="Upload profile picture"
                >
                  <Camera size={20} />
                </button>
              )}
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

            {saveError && (
              <div className="error-message">
                <div className="error-icon">⚠️</div>
                <div className="error-content">
                  <div className="error-title">Save Error</div>
                  <div className="error-description">{saveError}</div>
                </div>
              </div>
            )}
            
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
                      setSaveError(null);
                      setTempImageData(null); // Clear temporary image data
                    }}
                    className="cancel-button"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => {
                  setIsEditing(true);
                  setImageUploadError(null);
                }} className="edit-button">
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