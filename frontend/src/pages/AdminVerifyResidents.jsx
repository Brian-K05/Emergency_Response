import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import DashboardLayout from '../components/DashboardLayout';

const AdminVerifyResidents = () => {
  const { user } = useAuth();
  const [pendingResidents, setPendingResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPendingResidents();
  }, []);

  const fetchPendingResidents = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('pending_resident_verifications')
        .select('*')
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setPendingResidents(data || []);
    } catch (err) {
      console.error('Error fetching pending residents:', err);
      setError('Failed to load pending verifications');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (residentId, status, notes = '') => {
    try {
      setVerifying(residentId);
      setError('');

      const { error: verifyError } = await supabase.rpc('verify_resident_account', {
        p_user_id: residentId,
        p_verified_by: user.id,
        p_status: status,
        p_notes: notes || null
      });

      if (verifyError) throw verifyError;

      // Refresh list
      await fetchPendingResidents();
      alert(`Resident account ${status === 'verified' ? 'verified' : 'rejected'} successfully!`);
    } catch (err) {
      console.error('Error verifying resident:', err);
      setError(err.message || 'Failed to verify resident');
    } finally {
      setVerifying(null);
    }
  };

  const getDocumentUrl = (filePath) => {
    if (!filePath) return null;
    try {
      const { data } = supabase.storage
        .from('user-documents')
        .getPublicUrl(filePath);
      return data?.publicUrl;
    } catch (error) {
      console.error('Error getting document URL:', error);
      return null;
    }
  };

  if (!user || !['super_admin', 'municipal_admin', 'admin', 'mdrrmo'].includes(user.role)) {
    return (
      <DashboardLayout>
        <div className="section-modern">
          <h2>Access Denied</h2>
          <p>You do not have permission to access this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="section-modern">
        <div className="section-header">
          <div>
            <h2>Verify Resident Accounts</h2>
            <p className="section-subtitle">
              Review and verify resident accounts. Only verified residents can report incidents.
            </p>
          </div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading pending verifications...</p>
          </div>
        ) : pendingResidents.length === 0 ? (
          <div className="empty-state-modern">
            <div className="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 12l2 2 4-4"/>
                <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                <path d="M12 3c0 1-1 3-3 3S6 4 6 3s1-3 3-3 3 2 3 3"/>
                <path d="M12 21c0-1-1-3-3-3S6 20 6 21s1 3 3 3 3-2 3-3"/>
              </svg>
            </div>
            <h3>No Pending Verifications</h3>
            <p>All resident accounts have been reviewed.</p>
          </div>
        ) : (
          <div className="verification-list">
            {pendingResidents.map((resident) => (
              <div key={resident.id} className="incident-card-modern" style={{ marginBottom: '1.5rem' }}>
                <div className="incident-card-header">
                  <div>
                    <h3>{resident.full_name}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0.25rem 0' }}>
                      {resident.email} • {resident.phone_number || 'No phone'}
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0.25rem 0' }}>
                      📍 {resident.address || 'No address'} • {resident.municipality_name} • {resident.barangay_name}
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0.5rem 0' }}>
                      Registered: {new Date(resident.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(4, 70, 167, 0.05)', borderRadius: '8px' }}>
                  <h4 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '0.9rem' }}>Verification Documents</h4>
                  
                  {resident.verification_documents && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {resident.verification_documents.id_document && (
                        <div>
                          <strong style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Valid ID:</strong>
                          <a 
                            href={getDocumentUrl(resident.verification_documents.id_document)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn-secondary"
                            style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                          >
                            📄 View ID Document
                          </a>
                        </div>
                      )}
                      
                      {resident.verification_documents.proof_of_residence && (
                        <div>
                          <strong style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Proof of Residence:</strong>
                          <a 
                            href={getDocumentUrl(resident.verification_documents.proof_of_residence)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn-secondary"
                            style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                          >
                            📄 View Proof Document
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {(!resident.verification_documents || 
                    (!resident.verification_documents.id_document && !resident.verification_documents.proof_of_residence)) && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      ⚠️ No documents uploaded
                    </p>
                  )}
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      const reason = prompt('Enter rejection reason (optional):');
                      if (reason !== null) {
                        handleVerify(resident.id, 'rejected', reason);
                      }
                    }}
                    disabled={verifying === resident.id}
                    className="btn-secondary"
                    style={{ background: 'var(--scarlet-rush)', color: 'white' }}
                  >
                    {verifying === resident.id ? 'Processing...' : '❌ Reject'}
                  </button>
                  <button
                    onClick={() => handleVerify(resident.id, 'verified')}
                    disabled={verifying === resident.id}
                    className="btn-primary"
                  >
                    {verifying === resident.id ? 'Processing...' : '✅ Verify'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminVerifyResidents;

