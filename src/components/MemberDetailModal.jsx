import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../context/LanguageContext.jsx';
import { apiFetch } from '../utils/apiClient.js';

const MemberDetailModal = ({ visible, member, onClose, onAddChild, onRemoveChild, onUpdateMember, allMembers, isAdmin = false, adminToken = '' }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMember, setEditedMember] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [newChild, setNewChild] = useState({
    name: '',
    birthDate: '',
    birthMonth: '',
    birthDay: '',
    deathDate: '',
    isDeceased: false,
    gender: '',
    notes: '',
  });
  const { t } = useTranslation();

  useEffect(() => {
    if (!visible) {
      setShowAddForm(false);
      setIsEditing(false);
      setEditedMember(null);
      setNewChild({ name: '', birthDate: '', birthMonth: '', birthDay: '', deathDate: '', isDeceased: false, gender: '', notes: '' });
      return undefined;
    }

    if (member && !editedMember) {
      // Clean notes by removing image URL
      const cleanNotes = member.notes ? member.notes.replace(/Image:\s*.*?(?:\s*\||$)/g, '').trim() : '';
      
      setEditedMember({
        name: member.name || '',
        englishName: member.englishName || '',
        birthDate: member.birthDate || '',
        birthMonth: member.birthMonth ?? '',
        birthDay: member.birthDay ?? '',
        deathDate: member.deathDate || '',
        isDeceased: Boolean(member.isDeceased),
        gender: member.gender || '',
        address: member.address || '',
        mobile: member.mobile || '',
        notes: cleanNotes,
      });
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (showAddForm) {
          setShowAddForm(false);
        } else if (isEditing) {
          setIsEditing(false);
          const cleanNotesEsc = member.notes ? member.notes.replace(/Image:\s*.*?(?:\s*\||$)/g, '').trim() : '';
          setEditedMember({
            name: member.name || '',
            englishName: member.englishName || '',
            birthDate: member.birthDate || '',
            birthMonth: member.birthMonth ?? '',
            birthDay: member.birthDay ?? '',
            deathDate: member.deathDate || '',
            isDeceased: Boolean(member.isDeceased),
            gender: member.gender || '',
            address: member.address || '',
            mobile: member.mobile || '',
            notes: cleanNotesEsc,
          });
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [visible, onClose, showAddForm, isEditing, member, editedMember]);

  if (!visible || !member) {
    return null;
  }

  const imageUrl = member.notes?.match(/Image:\s*(.*?)(?:\s*\||$)/)?.[1]?.trim();
  const cleanNotes = member.notes ? member.notes.replace(/Image:\s*.*?(?:\s*\||$)/g, '').trim() : '';

  const getInitials = (name) => {
    if (!name) return '?';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleAddChildSubmit = (e) => {
    e.preventDefault();
    if (!newChild.name.trim()) {
      alert(t('member.validation.nameRequired'));
      return;
    }
    
    // Validate optional child birth month/day
    let cMonth = newChild.birthMonth === '' ? '' : parseInt(newChild.birthMonth, 10);
    let cDay = newChild.birthDay === '' ? '' : parseInt(newChild.birthDay, 10);
    if (cMonth !== '' && (isNaN(cMonth) || cMonth < 1 || cMonth > 12)) {
      alert(t('member.validation.birthMonth'));
      return;
    }
    if (cDay !== '' && (isNaN(cDay) || cDay < 1 || cDay > 31)) {
      alert(t('member.validation.birthDay'));
      return;
    }

    const childData = {
      name: newChild.name.trim(),
      birthDate: newChild.birthDate,
      birthMonth: cMonth === '' ? undefined : cMonth,
      birthDay: cDay === '' ? undefined : cDay,
      deathDate: newChild.deathDate,
      isDeceased: Boolean(newChild.isDeceased),
      gender: newChild.gender,
      notes: newChild.notes,
      generation: member.generation + 1,
    };
    
    onAddChild(member, childData);
    setShowAddForm(false);
    setNewChild({ name: '', birthDate: '', birthMonth: '', birthDay: '', deathDate: '', isDeceased: false, gender: '', notes: '' });
  };

  const handleRemoveChildClick = (childId) => {
    onRemoveChild(member.id, childId);
  };

  const getChildDetails = (childId) => {
    return allMembers?.find(m => m.id === childId);
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset to original values
      const cleanNotes = member.notes ? member.notes.replace(/Image:\s*.*?(?:\s*\||$)/g, '').trim() : '';
      
      setEditedMember({
        name: member.name || '',
        englishName: member.englishName || '',
        birthDate: member.birthDate || '',
        birthMonth: member.birthMonth ?? '',
        birthDay: member.birthDay ?? '',
        deathDate: member.deathDate || '',
        isDeceased: Boolean(member.isDeceased),
        gender: member.gender || '',
        address: member.address || '',
        mobile: member.mobile || '',
        notes: cleanNotes,
      });
    }
    setIsEditing(!isEditing);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editedMember.name.trim()) {
      alert(t('member.validation.nameRequired'));
      return;
    }
    
    // Preserve image URL in notes
    const imageUrl = member.notes?.match(/Image:\s*(.*?)(?:\s*\||$)/)?.[1]?.trim();
    let finalNotes = editedMember.notes?.trim() || '';
    if (imageUrl) {
      finalNotes = finalNotes ? `Image: ${imageUrl} | ${finalNotes}` : `Image: ${imageUrl}`;
    }
    
    // Validate and normalize birth month/day (optional)
    let birthMonthNum = editedMember?.birthMonth === '' ? '' : parseInt(editedMember.birthMonth, 10);
    let birthDayNum = editedMember?.birthDay === '' ? '' : parseInt(editedMember.birthDay, 10);
    if (birthMonthNum !== '' && (isNaN(birthMonthNum) || birthMonthNum < 1 || birthMonthNum > 12)) {
      alert(t('member.validation.birthMonth'));
      return;
    }
    if (birthDayNum !== '' && (isNaN(birthDayNum) || birthDayNum < 1 || birthDayNum > 31)) {
      alert(t('member.validation.birthDay'));
      return;
    }
    
    const updatedData = {
      name: editedMember.name.trim(),
      englishName: editedMember.englishName?.trim() || '',
      birthDate: editedMember.birthDate?.trim() || '',
      birthMonth: birthMonthNum === '' ? undefined : birthMonthNum,
      birthDay: birthDayNum === '' ? undefined : birthDayNum,
      deathDate: editedMember.deathDate?.trim() || '',
      isDeceased: Boolean(editedMember.isDeceased),
      gender: editedMember.gender || '',
      address: editedMember.address?.trim() || '',
      mobile: editedMember.mobile?.trim() || '',
      notes: finalNotes,
    };
    
    console.log('Saving member data:', updatedData);
    await onUpdateMember(member.id, updatedData);
    setIsEditing(false);
  };

  const handleImageUpload = async (e) => {
    if (!isAdmin) { alert('Admin login required to upload image'); return; }
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('memberId', member.id);

      const response = await apiFetch('/api/upload-image', {
        method: 'POST',
        headers: { 'X-Admin-Token': adminToken },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        alert('Image uploaded successfully!');
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="modal-card"
        role="document"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">
          ×
        </button>

        <div className="modal-hero">
          <div className="avatar-container">
            <div 
              className={`avatar-wrapper ${imageUrl ? 'has-image' : ''}`}
              onClick={() => imageUrl && setShowImagePreview(true)}
              style={{ cursor: imageUrl ? 'pointer' : 'default' }}
              title={imageUrl ? 'Click to preview' : ''}
            >
              {imageUrl ? (
                <img src={imageUrl} alt={member.name} />
              ) : (
                <span>{getInitials(member.name)}</span>
              )}
            </div>
            {isAdmin && (
            <label className="upload-image-btn" title="Upload photo">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                style={{ display: 'none' }}
              />
              {uploadingImage ? '⏳' : '📷'}
            </label>
            )}
          </div>
          <h2>{member.name || 'Unknown'}</h2>
          {(member.englishName && member.englishName.trim()) && (
            <div className="english-name-subtitle" title="English name">
              {member.englishName}
            </div>
          )}
          <div className="modal-badge">Generation {member.generation}</div>
          {isAdmin && (
            <button
              type="button"
              className="edit-toggle-btn"
              onClick={handleEditToggle}
              title={isEditing ? t('member.modal.cancelEdit') : t('member.modal.editMember')}
            >
              {isEditing ? `✕ ${t('member.modal.cancel')}` : `✎ ${t('member.modal.editButton')}`}
            </button>
          )}
        </div>

        <div className="modal-body">
          {isEditing ? (
            <form className="edit-member-form" onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label htmlFor="editName">{t('member.modal.nameLabel')} *</label>
                <input
                  id="editName"
                  type="text"
                  value={editedMember?.name || ''}
                  onChange={(e) => setEditedMember({ ...editedMember, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="editEnglishName">{t('member.modal.englishNameLabel')}</label>
                <input
                  id="editEnglishName"
                  type="text"
                  value={editedMember?.englishName || ''}
                  onChange={(e) => setEditedMember({ ...editedMember, englishName: e.target.value })}
                  placeholder="English translation"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="editBirthDate">{t('member.modal.birthDateLabel')}</label>
                  <input
                    id="editBirthDate"
                    type="text"
                    value={editedMember?.birthDate || ''}
                    onChange={(e) => setEditedMember({ ...editedMember, birthDate: e.target.value })}
                    placeholder="e.g., 1950"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="editBirthMonth">{t('member.modal.birthMonthLabel')}</label>
                  <input
                    id="editBirthMonth"
                    type="number"
                    min="1"
                    max="12"
                    value={editedMember?.birthMonth ?? ''}
                    onChange={(e) => setEditedMember({ ...editedMember, birthMonth: e.target.value })}
                    placeholder="MM"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="editBirthDay">{t('member.modal.birthDayLabel')}</label>
                  <input
                    id="editBirthDay"
                    type="number"
                    min="1"
                    max="31"
                    value={editedMember?.birthDay ?? ''}
                    onChange={(e) => setEditedMember({ ...editedMember, birthDay: e.target.value })}
                    placeholder="DD"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="editDeathDate">{t('member.modal.deathDateLabel')}</label>
                  <input
                    id="editDeathDate"
                    type="text"
                    value={editedMember?.deathDate || ''}
                    onChange={(e) => setEditedMember({ ...editedMember, deathDate: e.target.value })}
                    placeholder="e.g., 2020"
                  />
                </div>
              </div>
                <div className="form-group checkbox-field">
                  <label className="checkbox-label" htmlFor="editIsDeceased">
                    <input
                      id="editIsDeceased"
                      type="checkbox"
                      checked={Boolean(editedMember?.isDeceased)}
                      onChange={(e) => setEditedMember({ ...editedMember, isDeceased: e.target.checked })}
                    />
                    {t('member.modal.markDeceased')}
                  </label>
                </div>
              <div className="form-group">
                <label htmlFor="editGender">{t('member.modal.genderLabel')}</label>
                <select
                  id="editGender"
                  value={editedMember?.gender || ''}
                  onChange={(e) => setEditedMember({ ...editedMember, gender: e.target.value })}
                >
                  <option value="">Select gender</option>
                  <option value="Male">{t('member.modal.genderMale')}</option>
                  <option value="Female">{t('member.modal.genderFemale')}</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="editMobile">{t('member.modal.mobileLabel')}</label>
                <input
                  id="editMobile"
                  type="tel"
                  value={editedMember?.mobile || ''}
                  onChange={(e) => setEditedMember({ ...editedMember, mobile: e.target.value })}
                  placeholder="e.g., +91 9876543210"
                />
              </div>
              <div className="form-group">
                <label htmlFor="editAddress">{t('member.modal.addressLabel')}</label>
                <textarea
                  id="editAddress"
                  value={editedMember?.address || ''}
                  onChange={(e) => setEditedMember({ ...editedMember, address: e.target.value })}
                  placeholder="Full address"
                  rows="2"
                />
              </div>
              <div className="form-group">
                <label htmlFor="editNotes">{t('member.modal.notesLabel')}</label>
                <textarea
                  id="editNotes"
                  value={editedMember?.notes || ''}
                  onChange={(e) => setEditedMember({ ...editedMember, notes: e.target.value })}
                  placeholder="Additional information"
                  rows="4"
                />
              </div>
              <div className="form-buttons">
                <button type="submit" className="submit-btn">{t('member.modal.saveChanges')}</button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={handleEditToggle}
                >
                  {t('member.modal.cancel')}
                </button>
              </div>
            </form>
          ) : (
            <>
              {(member.englishName && member.englishName.trim()) && (
                <div className="modal-row">
                  <span>English Name:</span>
                  <strong>{member.englishName}</strong>
                </div>
              )}
              {(member.birthDate && member.birthDate.trim()) && (
                <div className="modal-row">
                  <span>Birth Date:</span>
                  <strong>{member.birthDate}</strong>
                </div>
              )}
              {(Number.isFinite(member.birthMonth) || Number.isFinite(member.birthDay)) && (
                <div className="modal-row">
                  <span>Birthday (MM-DD):</span>
                  <strong>{String(member.birthMonth || '').toString().padStart(2,'0')}-{String(member.birthDay || '').toString().padStart(2,'0')}</strong>
                </div>
              )}
              {(member.deathDate && member.deathDate.trim()) && (
                <div className="modal-row">
                  <span>Death Date:</span>
                  <strong>{member.deathDate}</strong>
                </div>
              )}
              <div className="modal-row status-row">
                <span>{t('member.modal.status')}:</span>
                <strong className={member.isDeceased ? 'status-deceased' : 'status-living'}>
                  {member.isDeceased ? t('member.status.deceased') : t('member.status.living')}
                </strong>
              </div>
              {(member.gender && member.gender.trim()) && (
                <div className="modal-row">
                  <span>Gender:</span>
                  <strong>{member.gender}</strong>
                </div>
              )}
              {(member.mobile && member.mobile.trim()) && (
                <div className="modal-row">
                  <span>Mobile:</span>
                  <strong>
                    <a href={`tel:${member.mobile}`} className="contact-link">
                      {member.mobile}
                    </a>
                  </strong>
                </div>
              )}
              {(member.address && member.address.trim()) && (
                <div className="modal-row">
                  <span>Address:</span>
                  <strong>{member.address}</strong>
                </div>
              )}
              {member.childrenIds && member.childrenIds.length > 0 && (
            <div className="modal-section">
              <h3 className="modal-section-title">{t('member.modal.childrenTitle', { count: member.childrenIds.length })}</h3>
              <div className="children-list">
                {member.childrenIds.map((childId) => {
                  const child = getChildDetails(childId);
                  return (
                    <div key={childId} className="child-item">
                      <div className="child-info">
                        <strong>{child?.name || `ID: ${childId}`}</strong>
                        {child?.birthDate && <span className="child-meta">{t('member.modal.bornLabel')}: {child.birthDate}</span>}
                      </div>
                      {isAdmin && (
                        <button
                          type="button"
                          className="remove-child-btn"
                          onClick={() => handleRemoveChildClick(childId)}
                          title="Remove child"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
              )}
          
              {cleanNotes && (
                <div className="modal-notes">
                  <h3>{t('member.modal.notesHeading')}</h3>
                  <p>{cleanNotes}</p>
                </div>
              )}

              {isAdmin && (
              <div className="modal-actions">
            {!showAddForm ? (
              <button
                type="button"
                className="add-child-btn"
                onClick={() => setShowAddForm(true)}
              >
                {t('member.modal.addChild')}
              </button>
            ) : (
              <form className="add-child-form" onSubmit={handleAddChildSubmit}>
                <h3 className="form-title">{t('member.modal.addChildTitle')}</h3>
                <div className="form-group">
                  <label htmlFor="childName">{t('member.modal.nameLabel')} *</label>
                  <input
                    id="childName"
                    type="text"
                    value={newChild.name}
                    onChange={(e) => setNewChild({ ...newChild, name: e.target.value })}
                    placeholder="Enter name"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="childBirthDate">{t('member.modal.birthDateLabel')}</label>
                    <input
                      id="childBirthDate"
                      type="text"
                      value={newChild.birthDate}
                      onChange={(e) => setNewChild({ ...newChild, birthDate: e.target.value })}
                      placeholder="e.g., 1990"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="childBirthMonth">{t('member.modal.birthMonthLabel')}</label>
                    <input
                      id="childBirthMonth"
                      type="number"
                      min="1"
                      max="12"
                      value={newChild.birthMonth}
                      onChange={(e) => setNewChild({ ...newChild, birthMonth: e.target.value })}
                      placeholder="MM"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="childBirthDay">{t('member.modal.birthDayLabel')}</label>
                    <input
                      id="childBirthDay"
                      type="number"
                      min="1"
                      max="31"
                      value={newChild.birthDay}
                      onChange={(e) => setNewChild({ ...newChild, birthDay: e.target.value })}
                      placeholder="DD"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="childDeathDate">{t('member.modal.deathDateLabel')}</label>
                    <input
                      id="childDeathDate"
                      type="text"
                      value={newChild.deathDate}
                      onChange={(e) => setNewChild({ ...newChild, deathDate: e.target.value })}
                      placeholder="e.g., 2020"
                    />
                  </div>
                </div>
                <div className="form-group checkbox-field">
                  <label className="checkbox-label" htmlFor="childIsDeceased">
                    <input
                      id="childIsDeceased"
                      type="checkbox"
                      checked={Boolean(newChild.isDeceased)}
                      onChange={(e) => setNewChild({ ...newChild, isDeceased: e.target.checked })}
                    />
                    {t('member.modal.markDeceased')}
                  </label>
                </div>
                <div className="form-group">
                  <label htmlFor="childGender">{t('member.modal.genderLabel')}</label>
                  <select
                    id="childGender"
                    value={newChild.gender}
                    onChange={(e) => setNewChild({ ...newChild, gender: e.target.value })}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">{t('member.modal.genderMale')}</option>
                    <option value="Female">{t('member.modal.genderFemale')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="childNotes">{t('member.modal.notesLabel')}</label>
                  <textarea
                    id="childNotes"
                    value={newChild.notes}
                    onChange={(e) => setNewChild({ ...newChild, notes: e.target.value })}
                    placeholder="Additional information"
                    rows="3"
                  />
                </div>
                <div className="form-buttons">
                  <button type="submit" className="submit-btn">{t('member.modal.addChildAction')}</button>
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewChild({ name: '', birthDate: '', birthMonth: '', birthDay: '', deathDate: '', isDeceased: false, gender: '', notes: '' });
                    }}
                  >
                    {t('member.modal.cancel')}
                  </button>
                </div>
              </form>
            )}
          </div>
          )}
            </>
          )}
        </div>
      </div>

      {showImagePreview && imageUrl && (
        <div 
          className="image-preview-overlay" 
          onClick={() => setShowImagePreview(false)}
        >
          <button 
            type="button" 
            className="preview-close-btn" 
            onClick={() => setShowImagePreview(false)}
            aria-label="Close preview"
          >
            ×
          </button>
          <div className="image-preview-container" onClick={(e) => e.stopPropagation()}>
            <img src={imageUrl} alt={member.name} />
            <p className="image-preview-caption">{member.name}</p>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default MemberDetailModal;
