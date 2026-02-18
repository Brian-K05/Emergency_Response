import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabaseService } from '../services/supabaseService';
import { getRoleDisplayName } from '../utils/roleUtils';
import DashboardLayout from '../components/DashboardLayout';

const ROLES_FOR_FILTER = [
  { value: '', label: 'All roles' },
  { value: 'super_admin', label: 'Super Administrator' },
  { value: 'municipal_admin', label: 'Municipal Administrator' },
  { value: 'mdrrmo', label: 'MDRRMO Staff' },
  { value: 'barangay_official', label: 'Barangay Official' },
  { value: 'resident', label: 'Community Resident' },
  { value: 'admin', label: 'Administrator' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

const AdminManageAccounts = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterMunicipality, setFilterMunicipality] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const isMunicipalAdmin = user?.role === 'municipal_admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const isBarangayOfficial = user?.role === 'barangay_official';

  useEffect(() => {
    if (!user || (!isSuperAdmin && !isMunicipalAdmin && !isBarangayOfficial)) return;
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        // Municipal admin: only their municipality; barangay official: only their barangay (residents); super admin: optional filters
        const municipalityId = isMunicipalAdmin
          ? user.municipality_id
          : (filterMunicipality || undefined);
        const barangayId = isBarangayOfficial ? user.barangay_id : undefined;
        const roleFilter = isBarangayOfficial ? 'resident' : (filterRole || undefined);
        const [usersData, munData] = await Promise.all([
          supabaseService.getUsersForAdmin({
            role: roleFilter,
            municipality_id: municipalityId,
            barangay_id: barangayId,
            is_active: filterStatus === '' ? undefined : filterStatus === 'true',
          }),
          supabaseService.getMunicipalities(),
        ]);
        if (!cancelled) {
          setAccounts(usersData || []);
          setMunicipalities(munData || []);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load accounts');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user, isSuperAdmin, isMunicipalAdmin, isBarangayOfficial, filterRole, filterMunicipality, filterStatus]);

  const filteredAccounts = useMemo(() => {
    if (!searchTerm.trim()) return accounts;
    const term = searchTerm.trim().toLowerCase();
    return accounts.filter(
      (u) =>
        (u.full_name || '').toLowerCase().includes(term) ||
        (u.email || '').toLowerCase().includes(term) ||
        (u.username || '').toLowerCase().includes(term)
    );
  }, [accounts, searchTerm]);

  if (!user || (!isSuperAdmin && !isMunicipalAdmin && !isBarangayOfficial)) {
    return (
      <DashboardLayout>
        <div className="section-modern">
          <h2>Access Denied</h2>
          <p>Only Super Administrators, Municipal Administrators, and Barangay Officials can access this page. Barangay officials see only residents in their barangay (view only).</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="section-modern">
        <div className="section-header">
          <div>
            <h2>Account Management</h2>
            <p className="section-subtitle">
              {isBarangayOfficial
                ? 'View only — residents in your barangay. You cannot manage or edit accounts.'
                : isMunicipalAdmin
                  ? `View and manage accounts in your municipality (${municipalities.find(m => m.id === user.municipality_id)?.name || user.municipality?.name || 'your municipality'}) only. You cannot see or manage accounts from other municipalities.`
                  : 'View and monitor all system accounts. You are not responsible for incidents—this is for oversight only.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        <div className="accounts-filters" style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
          alignItems: 'flex-end',
        }}>
          <label style={{ minWidth: '200px' }}>
            <span style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Search name, email, or username</span>
            <input
              type="search"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-modern"
              style={{ width: '100%' }}
            />
          </label>
          {!isBarangayOfficial && (
            <label>
              <span style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Role</span>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="input-modern"
              >
                {ROLES_FOR_FILTER.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </label>
          )}
          {isSuperAdmin && (
            <label>
              <span style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Municipality</span>
              <select
                value={filterMunicipality}
                onChange={(e) => setFilterMunicipality(e.target.value)}
                className="input-modern"
              >
                <option value="">All municipalities</option>
                {municipalities.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </label>
          )}
          {isMunicipalAdmin && !isBarangayOfficial && (
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', alignSelf: 'flex-end', paddingBottom: '0.5rem' }}>
              Municipality: {municipalities.find(m => m.id === user.municipality_id)?.name || user.municipality?.name || 'Your municipality'}
            </span>
          )}
          {isBarangayOfficial && (
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', alignSelf: 'flex-end', paddingBottom: '0.5rem' }}>
              Barangay: {user.barangay?.name || 'Your barangay'} — View only
            </span>
          )}
          <label>
            <span style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Status</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-modern"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <p>Loading accounts…</p>
        ) : (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="table-modern" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Municipality</th>
                  <th>Barangay</th>
                  <th>Status</th>
                  <th>Verification</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>
                      No accounts match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((u) => (
                    <tr key={u.id}>
                      <td>{u.full_name || '—'}</td>
                      <td>{u.username || '—'}</td>
                      <td>{u.email || '—'}</td>
                      <td>{getRoleDisplayName(u.role)}</td>
                      <td>{u.municipality?.name ?? '—'}</td>
                      <td>{u.barangay?.name ?? '—'}</td>
                      <td>
                        <span className={u.is_active !== false ? 'badge badge-resolved' : 'badge badge-cancelled'}>
                          {u.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        {u.role === 'resident'
                          ? (u.verification_status === 'verified' ? (
                              <span className="badge badge-resolved">Verified</span>
                            ) : u.verification_status === 'pending' ? (
                              <span className="badge badge-medium">Pending</span>
                            ) : (
                              <span className="badge badge-cancelled">{u.verification_status || '—'}</span>
                            ))
                          : '—'}
                      </td>
                      <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredAccounts.length > 0 && (
          <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Showing {filteredAccounts.length} account{filteredAccounts.length !== 1 ? 's' : ''}.
          </p>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminManageAccounts;
