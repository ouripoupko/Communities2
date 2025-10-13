import React, { useState, useRef, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { readProfile } from '../../store/slices/userSlice';
import { useEventStream, useEventStreamConnection } from '../../hooks/useEventStream';
import { User, Camera, Save, Key, Server } from 'lucide-react';
import styles from './Profile.module.scss';
import { contractWrite } from '../../services/api';

const Profile: React.FC = () => {
  const user = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();
  const { isConnected } = useEventStreamConnection();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Find the profile contract
  const profileContract = user.contracts.find((c: any) => c.name === 'unique-gloki-communities-profile-contract');

  // Update local state when profile is loaded
  useEffect(() => {
    if (user.profile) {
      setFirstName(user.profile.firstName || '');
      setLastName(user.profile.lastName || '');
      setImageData(user.profile.userPhoto || null);
      setImageUploadError(null); // Clear any previous image upload errors
    }
  }, [user.profile]);

  // Listen for profile contract write events
  useEventStream('contract_write', (event) => {
    if (user && profileContract && event.contract === profileContract.id) {
      // Dispatch profile read to get updated profile from server
      dispatch(readProfile());
    }
  });

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
    if (user.serverUrl && user.publicKey && profileContract) {
      try {
        setIsSaving(true);
        setSaveError(null);
        
        await contractWrite({
          serverUrl: user.serverUrl,
          publicKey: user.publicKey,
          contractId: profileContract.id,
          method: 'set_values',
          args: {items: { firstName, lastName, userPhoto: imageData }}
        });
        
        // Profile data will be refreshed automatically via SSE event
        setIsEditing(false);
      } catch (error: unknown) {
        console.error('Failed to save profile:', error);
        setSaveError('Failed to save profile. Please check your connection and try again.');
      } finally {
        setIsSaving(false);
      }
    } else {
      setSaveError('Missing user credentials or profile contract. Please try logging in again.');
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
        
        // Store the processed image data
        setImageData(resizedImageData);
        
      } catch (error: unknown) {
        // console.error('Failed to process image:', error);
        setImageUploadError('Failed to process image. Please try again.');
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (user.loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingMessage}>Loading profile...</div>
      </div>
    );
  }

  if (user.error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorMessage}>
          <div className={styles.errorIcon}>⚠️</div>
          <div className={styles.errorContent}>
            <div className={styles.errorTitle}>Connection Error</div>
            <div className={styles.errorDescription}>{user.error}</div>
            <div className={styles.errorHelp}>
              Please make sure the server is running and try refreshing the page.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Profile</h1>
        <p>Manage your personal information and identity</p>
        {user.profile && (
          <div className={styles.profileName}>
            {user.profile.firstName} {user.profile.lastName}
          </div>
        )}
        <div className={styles.eventStreamStatus}>
          <span className={`${styles.statusIndicator} ${isConnected ? styles.connected : styles.disconnected}`}>
            {isConnected ? '🟢 SSE Connected' : '🔴 SSE Disconnected'}
          </span>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.profileSection}>
          <div className={styles.profilePictureSection}>
            <div className={styles.profilePicture}>
              {imageData ? (
                <img src={imageData} alt="Profile" />
              ) : (
                <div className={styles.profilePicturePlaceholder}>
                  <User size={48} />
                </div>
              )}
              {imageUploadError && (
                <div className={styles.imageUploadError}>
                  <div className={styles.errorIcon}>⚠️</div>
                  <div className={styles.errorContent}>
                    <div className={styles.errorTitle}>Upload Error</div>
                    <div className={styles.errorDescription}>{imageUploadError}</div>
                  </div>
                </div>
              )}
              {isEditing && (
                <button
                  onClick={triggerFileInput}
                  className={styles.uploadButton}
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

          <div className={styles.profileForm}>
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
              <div className={styles.errorMessage}>
                <div className={styles.errorIcon}>⚠️</div>
                <div className={styles.errorContent}>
                  <div className={styles.errorTitle}>Save Error</div>
                  <div className={styles.errorDescription}>{saveError}</div>
                </div>
              </div>
            )}
            
            <div className="form-actions">
              {isEditing ? (
                <>
                  <button 
                    onClick={handleSave} 
                    className="save-button"
                    disabled={isSaving}
                  >
                    <Save size={16} />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setFirstName(user.profile?.firstName || '');
                      setLastName(user.profile?.lastName || '');
                      setImageData(user.profile?.userPhoto || null);
                      setSaveError(null);
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

        <div className={styles.identitySection}>
          <h3>Identity Information</h3>
          <div className={styles.identityInfo}>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>
                <Key size={16} />
                Public Key
              </div>
              <div className={styles.infoValue}>
                <code>{user?.publicKey}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(user?.publicKey || '')}
                  className={styles.copyButton}
                  title="Copy to clipboard"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>
                <Server size={16} />
                Server URL
              </div>
              <div className={styles.infoValue}>
                <code>{user?.serverUrl}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(user?.serverUrl || '')}
                  className={styles.copyButton}
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