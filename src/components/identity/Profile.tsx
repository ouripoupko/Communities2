import React, { useState, useRef, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { readProfile } from '../../store/slices/userSlice';
import { useEventStream, useEventStreamConnection } from '../../hooks/useEventStream';
import { User, Camera, Save, Key, Server, ChevronDown, ChevronUp } from 'lucide-react';
import styles from './Profile.module.scss';
import { setValues } from '../../services/contracts/gloki';
import SearchableSelect from '../shared/SearchableSelect';
import { COUNTRIES, OTHER_COUNTRY } from '../../utils/countries';

const Profile: React.FC = () => {
  const user = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();
  const { isConnected } = useEventStreamConnection();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [country, setCountry] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showIdentity, setShowIdentity] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use the profile contract ID from the slice
  const profileContractId = user.profileContractId;

  // Update local state when profile is loaded
  useEffect(() => {
    if (user.profile) {
      setFirstName(user.profile.firstName || '');
      setLastName(user.profile.lastName || '');
      setImageData(user.profile.userPhoto || null);
      setOpenaiApiKey(user.profile.openaiApiKey || '');
      setCountry(user.profile.country || '');
      setImageUploadError(null); // Clear any previous image upload errors
    }
  }, [user.profile]);

  // Listen for profile contract write events
  useEventStream('contract_write', (event) => {
    if (user && profileContractId && event.contract === profileContractId) {
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
    if (user.serverUrl && user.publicKey && profileContractId) {
      try {
        setIsSaving(true);
        setSaveError(null);
        
        await setValues(
          user.serverUrl,
          user.publicKey,
          profileContractId,
          firstName,
          lastName,
          imageData,
          openaiApiKey,
          country,
        );
        
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
      <div className={styles.profileCard}>
        {/* Photo + name row */}
        <div className={styles.profileTop}>
          <div className={styles.profilePicture}>
            {imageData ? (
              <img src={imageData} alt="Profile" />
            ) : (
              <div className={styles.profilePicturePlaceholder}>
                <User size={32} />
              </div>
            )}
            {isEditing && (
              <button onClick={triggerFileInput} className={styles.uploadButton} title="Upload photo">
                <Camera size={14} />
              </button>
            )}
          </div>
          <div className={styles.profileSummary}>
            {user.profile && (
              <div className={styles.profileName}>
                {user.profile.firstName} {user.profile.lastName}
              </div>
            )}
            <span className={`${styles.statusDot} ${isConnected ? styles.connected : styles.disconnected}`} />
          </div>
          {!isEditing && (
            <button onClick={() => { setIsEditing(true); setImageUploadError(null); }} className={styles.editBtn}>
              Edit
            </button>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />

        {imageUploadError && (
          <div className={styles.inlineError}>{imageUploadError}</div>
        )}

        {/* Form fields */}
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label htmlFor="firstName">First Name</label>
            <input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={!isEditing} />
          </div>
          <div className={styles.formField}>
            <label htmlFor="lastName">Last Name</label>
            <input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={!isEditing} />
          </div>
        </div>

        <div className={styles.formField}>
          <label htmlFor="country">Country</label>
          <SearchableSelect
            options={[
              ...COUNTRIES.map((c) => ({ value: c.code, label: c.name, icon: c.flag })),
              { value: OTHER_COUNTRY.code, label: OTHER_COUNTRY.name, icon: OTHER_COUNTRY.flag },
            ]}
            value={country}
            onChange={(val) => setCountry(val)}
            placeholder="Select your country"
            disabled={!isEditing}
          />
        </div>

        <div className={styles.formField}>
          <label htmlFor="openaiApiKey">AI API Key</label>
          <input id="openaiApiKey" type="password" value={openaiApiKey} onChange={(e) => setOpenaiApiKey(e.target.value)} disabled={!isEditing} placeholder="Optional" />
        </div>

        {saveError && <div className={styles.inlineError}>{saveError}</div>}

        {isEditing && (
          <div className={styles.actionRow}>
            <button onClick={handleSave} className={styles.saveBtn} disabled={isSaving}>
              <Save size={14} /> {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setFirstName(user.profile?.firstName || '');
                setLastName(user.profile?.lastName || '');
                setImageData(user.profile?.userPhoto || null);
                setOpenaiApiKey(user.profile?.openaiApiKey || '');
                setCountry(user.profile?.country || '');
                setSaveError(null);
              }}
              className={styles.cancelBtn}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Collapsible identity section */}
      <button className={styles.identityToggle} onClick={() => setShowIdentity(!showIdentity)}>
        <span>Network Identity</span>
        {showIdentity ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {showIdentity && (
        <div className={styles.identitySection}>
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}><Key size={14} /> Public Key</div>
            <div className={styles.infoHint}>Your unique identity on the network</div>
            <div className={styles.infoValue}>
              <code>{user?.publicKey}</code>
              <button onClick={() => navigator.clipboard.writeText(user?.publicKey || '')} className={styles.copyButton}>Copy</button>
            </div>
          </div>
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}><Server size={14} /> Server URL</div>
            <div className={styles.infoHint}>The server hosting your data</div>
            <div className={styles.infoValue}>
              <code>{user?.serverUrl}</code>
              <button onClick={() => navigator.clipboard.writeText(user?.serverUrl || '')} className={styles.copyButton}>Copy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile; 