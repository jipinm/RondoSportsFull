import { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, X, Eye, EyeOff } from 'lucide-react';
import styles from './AdminUsers.module.css';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  last_login_at: string | null;
  created_at: string;
}

interface UserFormData {
  name: string;
  email: string;
  password?: string;
  role: string;
  status: string;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'staff',
    status: 'active'
  });
  const [formErrors, setFormErrors] = useState<Partial<UserFormData>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    console.log('🔄 AdminUsers component mounted/updated');
    console.log('🔑 Access Token:', localStorage.getItem('access_token') ? 'Present' : 'Missing');
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      console.log('=== FETCH USERS REQUEST ===');
      console.log('URL:', `${import.meta.env.VITE_API_URL}/admin/users`);
      console.log('Method: GET');
      console.log('Headers:', {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Response Status:', response.status);
      console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const data = await response.json();
        console.log('Response Data:', data);
        setUsers(data.data || []);
      } else {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !filterRole || user.role === filterRole;
    const matchesStatus = !filterStatus || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'super_admin': return styles.roleSuperAdmin;
      case 'admin': return styles.roleAdmin;
      case 'manager': return styles.roleManager;
      case 'staff': return styles.roleStaff;
      default: return styles.roleViewer;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active': return styles.statusActive;
      case 'inactive': return styles.statusInactive;
      default: return styles.statusSuspended;
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'staff',
      status: 'active'
    });
    setFormErrors({});
    setGeneralError(null);
    setShowModal(true);
  };

  const handleEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      status: user.status
    });
    setFormErrors({});
    setGeneralError(null);
    setShowModal(true);
  };

  const handleDeleteClick = (user: AdminUser) => {
    setDeletingUser(user);
    setShowDeleteConfirm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setGeneralError(null);
    setSubmitting(true);

    try {
      const token = localStorage.getItem('access_token');
      const url = editingUser
        ? `${import.meta.env.VITE_API_URL}/admin/users/${editingUser.id}`
        : `${import.meta.env.VITE_API_URL}/admin/users`;

      const method = editingUser ? 'PUT' : 'POST';

      const body: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: formData.status
      };

      if (!editingUser || formData.password) {
        body.password = formData.password;
      }

      console.log('=== USER SUBMIT REQUEST ===');
      console.log('Action:', editingUser ? 'UPDATE' : 'CREATE');
      console.log('URL:', url);
      console.log('Method:', method);
      console.log('Request Body:', body);
      console.log('Headers:', {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      });

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      console.log('Response Status:', response.status);
      console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('Response Data:', data);

      if (response.ok) {
        console.log('✅ SUCCESS: User operation completed');
        setShowModal(false);
        fetchUsers();
      } else {
        console.error('❌ ERROR: User operation failed');
        if (data.errors) {
          // Field-specific errors
          setFormErrors(data.errors);
          console.log('Field Errors:', data.errors);
        } else {
          // General API errors (like "email already exists")
          setGeneralError(data.error || 'Failed to save user');
          console.error('General Error:', data.error);
        }
      }
    } catch (error) {
      console.error('❌ NETWORK ERROR:', error);
      setGeneralError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;

    try {
      const token = localStorage.getItem('access_token');

      console.log('=== DELETE USER REQUEST ===');
      console.log('User to delete:', deletingUser.name, `(${deletingUser.email})`);
      console.log('URL:', `${import.meta.env.VITE_API_URL}/admin/users/${deletingUser.id}`);
      console.log('Method: DELETE');
      console.log('Headers:', {
        'Authorization': `Bearer ${token}`,
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/users/${deletingUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Response Status:', response.status);
      console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        console.log('✅ SUCCESS: User deleted');
        setShowDeleteConfirm(false);
        setDeletingUser(null);
        fetchUsers();
      } else {
        const data = await response.json();
        console.error('❌ ERROR: Delete failed');
        console.error('Error Response:', data);
        alert(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('❌ NETWORK ERROR (Delete):', error);
      alert('Failed to delete user');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <Users size={32} />
          <div>
            <h1>Admin Users Management</h1>
            <p>Manage admin users and their access levels</p>
          </div>
        </div>
        <button className={styles.addButton} onClick={handleAddUser}>
          <Plus size={20} />
          Add New User
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="staff">Staff</option>
          <option value="viewer">Viewer</option>
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading users...</div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`${styles.badge} ${getRoleBadgeClass(user.role)}`}>
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${getStatusBadgeClass(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>{user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}</td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className={styles.actions}>
                      <button 
                        className={styles.editButton} 
                        title="Edit"
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        className={styles.deleteButton} 
                        title="Delete"
                        onClick={() => handleDeleteClick(user)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className={styles.noData}>No users found</div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>
              <button className={styles.closeButton} onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>

            {generalError && (
              <div className={styles.generalError}>
                <div className={styles.errorIcon}>⚠️</div>
                <div className={styles.errorContent}>
                  <strong>Error:</strong> {generalError}
                </div>
                <button
                  className={styles.errorClose}
                  onClick={() => setGeneralError(null)}
                  aria-label="Close error"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    console.log('📝 Name changed:', e.target.value);
                    setFormData({ ...formData, name: e.target.value });
                  }}
                  placeholder="Enter full name"
                  required
                />
                {formErrors.name && <div className={styles.error}>{formErrors.name}</div>}
              </div>

              <div className={styles.formGroup}>
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                  required
                />
                {formErrors.email && <div className={styles.error}>{formErrors.email}</div>}
              </div>

              <div className={styles.formGroup}>
                <label>Password {!editingUser && '*'}</label>
                <div className={styles.passwordInputWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? 'Leave blank to keep current password' : 'Enter password'}
                    required={!editingUser}
                    className={styles.passwordInput}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {formErrors.password && <div className={styles.error}>{formErrors.password}</div>}
              </div>

              <div className={styles.formGroup}>
                <label>Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                  <option value="viewer">Viewer</option>
                </select>
                {formErrors.role && <div className={styles.error}>{formErrors.role}</div>}
              </div>

              <div className={styles.formGroup}>
                <label>Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
                {formErrors.status && <div className={styles.error}>{formErrors.status}</div>}
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelButton} onClick={() => {
                  console.log('❌ Cancel button clicked');
                  setShowModal(false);
                }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={submitting}
                  onClick={(_) => {
                    console.log('🚀 Submit button clicked');
                    console.log('Form Data:', formData);
                  }}
                >
                  {submitting ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingUser && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div className={`${styles.modal} ${styles.confirmModal}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Confirm Delete</h2>
              <button className={styles.closeButton} onClick={() => setShowDeleteConfirm(false)}>
                <X size={24} />
              </button>
            </div>

            <div className={styles.confirmMessage}>
              Are you sure you want to delete the user <strong>{deletingUser.name}</strong> ({deletingUser.email})?
              <br /><br />
              This action cannot be undone.
            </div>

            <div className={styles.confirmActions}>
              <button className={styles.confirmCancel} onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className={styles.confirmDelete} onClick={handleDelete}>
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
