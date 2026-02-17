import React from 'react';
import Modal from './Modal';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getRoleDisplayName } from '../utils/roleUtils';

const ProfileModal = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Profile" size="small">
      <div className="profile-modal-content">
        <div className="profile-header">
          <div className="profile-avatar-large">
            {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="profile-info">
            <h3>{user?.full_name || 'User'}</h3>
            <span className="profile-role">{getRoleDisplayName(user?.role)}</span>
          </div>
        </div>
        
        <div className="profile-details">
          <div className="profile-detail-item">
            <span className="detail-label">Email</span>
            <span className="detail-value">{user?.email || 'N/A'}</span>
          </div>
          {user?.phone_number && (
            <div className="profile-detail-item">
              <span className="detail-label">Phone</span>
              <span className="detail-value">{user.phone_number}</span>
            </div>
          )}
          {user?.municipality && (
            <div className="profile-detail-item">
              <span className="detail-label">Municipality</span>
              <span className="detail-value">{user.municipality.name}</span>
            </div>
          )}
          {user?.barangay && (
            <div className="profile-detail-item">
              <span className="detail-label">Barangay</span>
              <span className="detail-value">{user.barangay.name}</span>
            </div>
          )}
        </div>

        <div className="profile-actions">
          <button onClick={handleLogout} className="btn-secondary btn-full">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            Logout
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ProfileModal;

