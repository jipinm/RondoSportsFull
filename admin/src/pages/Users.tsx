import React, { useState } from 'react';
import { Search, X, Eye, Edit, UserX, Users as UsersIcon, Shield, User as UserIcon } from 'lucide-react';
import { users, type User } from '../mock-data/data';
import Card from '../components/Card';
import Button from '../components/Button';
import styles from './Users.module.css';

interface UserDetailsModalProps {
  user: User;
  onClose: () => void;
  onStatusChange: (id: number, newStatus: 'active' | 'inactive') => void;
  onRoleChange: (id: number, newRole: 'admin' | 'super_admin' | 'content_manager' | 'support_agent' | 'client') => void;
  onTypeChange?: (id: number, newType: 'admin' | 'client') => void;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ 
  user, 
  onClose, 
  onStatusChange,
  onRoleChange,
  onTypeChange
}) => {
  const [editMode, setEditMode] = useState(false);
  const [editedUser, setEditedUser] = useState({ ...user });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedUser({ ...editedUser, [name]: value } as User);
  };

  const handleStatusChange = () => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    onStatusChange(user.id, newStatus);
    onClose();
  };

  const handleSave = () => {
    if (editedUser.role !== user.role) {
      onRoleChange(user.id, editedUser.role);
    }
    if (onTypeChange && editedUser.type !== user.type) {
      onTypeChange(user.id, editedUser.type);
    }
    onClose();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {editMode ? 'Edit User' : 'User Details'}
          </h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.modalContent}>
          <div className={styles.userInfoGrid}>
            <div className={styles.userInfoItem}>
              <span className={styles.userInfoLabel}>User ID:</span>
              <span className={styles.userInfoValue}>{user.id}</span>
            </div>
            <div className={styles.userInfoItem}>
              <span className={styles.userInfoLabel}>Name:</span>
              {editMode ? (
                <input
                  type="text"
                  name="name"
                  value={editedUser.name}
                  onChange={handleInputChange}
                  className={styles.editInput}
                />
              ) : (
                <span className={styles.userInfoValue}>{user.name}</span>
              )}
            </div>
            <div className={styles.userInfoItem}>
              <span className={styles.userInfoLabel}>Email:</span>
              {editMode ? (
                <input
                  type="email"
                  name="email"
                  value={editedUser.email}
                  onChange={handleInputChange}
                  className={styles.editInput}
                />
              ) : (
                <span className={styles.userInfoValue}>{user.email}</span>
              )}
            </div>
            <div className={styles.userInfoItem}>
              <span className={styles.userInfoLabel}>Status:</span>
              <span className={`${styles.userStatus} ${styles[user.status]}`}>
                {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
              </span>
            </div>
            <div className={styles.userInfoItem}>
              <span className={styles.userInfoLabel}>Type:</span>
              {editMode ? (
                <select
                  name="type"
                  value={editedUser.type}
                  onChange={handleInputChange}
                  className={styles.editSelect}
                >
                  <option value="admin">Admin</option>
                  <option value="client">Client</option>
                </select>
              ) : (
                <span className={styles.userInfoValue}>
                  {user.type.charAt(0).toUpperCase() + user.type.slice(1)}
                </span>
              )}
            </div>
            <div className={styles.userInfoItem}>
              <span className={styles.userInfoLabel}>Role:</span>
              {editMode ? (
                <select
                  name="role"
                  value={editedUser.role}
                  onChange={handleInputChange}
                  className={styles.editSelect}
                >
                  {editedUser.type === 'admin' ? (
                    <>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                      <option value="content_manager">Content Manager</option>
                      <option value="support_agent">Support Agent</option>
                    </>
                  ) : (
                    <option value="client">Client</option>
                  )}
                </select>
              ) : (
                <span className={styles.userInfoValue}>
                  {user.role === 'super_admin' 
                    ? 'Super Admin' 
                    : user.role === 'content_manager'
                    ? 'Content Manager'
                    : user.role === 'support_agent'
                    ? 'Support Agent'
                    : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
              )}
            </div>
            <div className={styles.userInfoItem}>
              <span className={styles.userInfoLabel}>Joined Date:</span>
              <span className={styles.userInfoValue}>{formatDate(user.joinedDate)}</span>
            </div>
            
            {user.type === 'admin' && user.permissions && (
              <div className={`${styles.userInfoItem} ${styles.permissions}`}>
                <span className={styles.userInfoLabel}>Permissions:</span>
                <div className={styles.permissionsList}>
                  {user.permissions.map((permission, index) => (
                    <span key={index} className={styles.permissionTag}>
                      {permission.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className={styles.modalFooter}>
          {editMode ? (
            <>
              <Button variant="secondary" onClick={() => setEditMode(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleSave}>Save Changes</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose}>Close</Button>
              <Button variant="primary" onClick={() => setEditMode(true)}>
                <Edit size={16} /> Edit User
              </Button>
              <Button 
                variant={user.status === 'active' ? 'danger' : 'primary'}
                onClick={handleStatusChange}
              >
                <UserX size={16} />
                {user.status === 'active' ? 'Deactivate User' : 'Activate User'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface AddUserModalProps {
  onClose: () => void;
  onAddUser: (user: Omit<User, 'id'>) => void;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ onClose, onAddUser }) => {
  const [newUser, setNewUser] = useState<Omit<User, 'id'>>({
    name: '',
    email: '',
    status: 'active',
    joinedDate: new Date().toISOString(),
    role: 'client',
    type: 'client',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser({ ...newUser, [name]: value });
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as 'admin' | 'client';
    setNewUser({ 
      ...newUser, 
      type, 
      role: type === 'admin' ? 'admin' : 'client',
      permissions: type === 'admin' ? ['users_view'] : undefined
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddUser(newUser);
    onClose();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Add New User</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.modalContent}>
          <form onSubmit={handleSubmit}>
            <div className={styles.userInfoGrid}>
              <div className={styles.userInfoItem}>
                <label className={styles.userInfoLabel} htmlFor="name">Name:</label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={newUser.name}
                  onChange={handleInputChange}
                  className={styles.editInput}
                  required
                />
              </div>
              <div className={styles.userInfoItem}>
                <label className={styles.userInfoLabel} htmlFor="email">Email:</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={newUser.email}
                  onChange={handleInputChange}
                  className={styles.editInput}
                  required
                />
              </div>
              <div className={styles.userInfoItem}>
                <label className={styles.userInfoLabel} htmlFor="type">User Type:</label>
                <select
                  id="type"
                  name="type"
                  value={newUser.type}
                  onChange={handleTypeChange}
                  className={styles.editSelect}
                >
                  <option value="client">Client</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className={styles.userInfoItem}>
                <label className={styles.userInfoLabel} htmlFor="role">Role:</label>
                <select
                  id="role"
                  name="role"
                  value={newUser.role}
                  onChange={handleInputChange}
                  className={styles.editSelect}
                  disabled={newUser.type === 'client'}
                >
                  {newUser.type === 'admin' ? (
                    <>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                      <option value="content_manager">Content Manager</option>
                      <option value="support_agent">Support Agent</option>
                    </>
                  ) : (
                    <option value="client">Client</option>
                  )}
                </select>
              </div>
              <div className={styles.userInfoItem}>
                <label className={styles.userInfoLabel} htmlFor="status">Status:</label>
                <select
                  id="status"
                  name="status"
                  value={newUser.status}
                  onChange={handleInputChange}
                  className={styles.editSelect}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button variant="primary" type="submit">Add User</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const Users: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'admins' | 'clients'>('all');
  const [usersList, setUsersList] = useState<User[]>(users);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const itemsPerPage = 5;
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };
  
  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };
  
  const handleStatusChange = (id: number, newStatus: 'active' | 'inactive') => {
    const updatedUsers = usersList.map(user => 
      user.id === id ? { ...user, status: newStatus } : user
    );
    setUsersList(updatedUsers);
  };

  const handleRoleChange = (id: number, newRole: 'admin' | 'super_admin' | 'content_manager' | 'support_agent' | 'client') => {
    const updatedUsers = usersList.map(user => 
      user.id === id ? { ...user, role: newRole } : user
    );
    setUsersList(updatedUsers);
  };

  const handleTypeChange = (id: number, newType: 'admin' | 'client') => {
    const updatedUsers = usersList.map(user => 
      user.id === id ? { 
        ...user, 
        type: newType,
        role: newType === 'admin' ? 'admin' : 'client',
        permissions: newType === 'admin' ? ['users_view'] : undefined
      } as User : user
    );
    setUsersList(updatedUsers);
  };

  const handleAddUser = (newUserData: Omit<User, 'id'>) => {
    // Create a new user with an auto-incremented ID
    const maxId = Math.max(...usersList.map(user => user.id), 0);
    const newUser = {
      id: maxId + 1,
      ...newUserData
    };
    
    setUsersList([...usersList, newUser]);
    setCurrentPage(Math.ceil((usersList.length + 1) / itemsPerPage)); // Navigate to the page with the new user
  };

  // Filter users based on active tab, search, and filters
  const filteredUsers = usersList.filter(user => {
    // Filter by tab first
    const matchesTab = 
      activeTab === 'all' || 
      (activeTab === 'admins' && user.type === 'admin') ||
      (activeTab === 'clients' && user.type === 'client');
      
    if (!matchesTab) return false;
    
    // Then apply other filters
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });
  
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const adminsCount = usersList.filter(user => user.type === 'admin').length;
  const clientsCount = usersList.filter(user => user.type === 'client').length;

  return (
    <div className={styles.usersContainer}>
      <h1 className={styles.pageTitle}>Users Management</h1>
      
      <div className={styles.tabs}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'all' ? styles.activeTab : ''}`}
          onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
        >
          <UsersIcon size={18} />
          All Users
          <span className={styles.countBadge}>{usersList.length}</span>
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'admins' ? styles.activeTab : ''}`}
          onClick={() => { setActiveTab('admins'); setCurrentPage(1); }}
        >
          <Shield size={18} />
          Admins
          <span className={styles.countBadge}>{adminsCount}</span>
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'clients' ? styles.activeTab : ''}`}
          onClick={() => { setActiveTab('clients'); setCurrentPage(1); }}
        >
          <UserIcon size={18} />
          Clients
          <span className={styles.countBadge}>{clientsCount}</span>
        </button>
      </div>
      
      <Card className={styles.usersCard}>        <div className={styles.filtersContainer}>
          <div className={styles.filterItem}>
            <label htmlFor="searchInput">Search</label>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                id="searchInput"
                type="text"
                placeholder="Search users..."
                className={styles.searchInput}
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
          </div>
            <div className={styles.filterItem}>
            <label htmlFor="roleFilter">Role</label>
            <select id="roleFilter" className={styles.filterSelect} value={roleFilter} onChange={handleRoleFilterChange}>
              <option value="all">All Roles</option>
              {activeTab === 'all' || activeTab === 'admins' ? (
                <>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="content_manager">Content Manager</option>
                  <option value="support_agent">Support Agent</option>
                </>
              ) : null}
              {activeTab === 'all' || activeTab === 'clients' ? (
                <option value="client">Client</option>
              ) : null}
            </select>
          </div>

          <div className={styles.filterItem}>
            <label htmlFor="statusFilter">Status</label>
            <select id="statusFilter" className={styles.filterSelect} value={statusFilter} onChange={handleStatusFilterChange}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
            <div className={styles.filterItem}>
            <label className={styles.invisibleLabel}>Action</label>
            <Button 
              variant="primary" 
              size="sm" 
              className={styles.addUserButton}
              onClick={() => setShowAddModal(true)}
            >
              + Add User
            </Button>
          </div>
        </div>
        
        <div className={styles.tableContainer}>
          <table className={styles.usersTable}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      {user.role === 'super_admin' 
                        ? 'Super Admin' 
                        : user.role === 'content_manager'
                        ? 'Content Manager'
                        : user.role === 'support_agent'
                        ? 'Support Agent'
                        : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </td>
                    <td>
                      <span className={`${styles.userStatus} ${styles[user.status]}`}>
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                    </td>
                    <td>{formatDate(user.joinedDate)}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                          className={styles.viewButton}
                        >
                          <Eye size={16} /> View
                        </Button>
                        
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                          className={styles.editButton}
                        >
                          <Edit size={16} /> Edit
                        </Button>
                        
                        <Button 
                          variant={user.status === 'active' ? 'danger' : 'primary'}
                          size="sm"
                          onClick={() => handleStatusChange(user.id, user.status === 'active' ? 'inactive' : 'active')}
                          className={user.status === 'active' ? styles.deactivateButton : styles.activateButton}
                        >
                          <UserX size={16} />
                          {user.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={styles.noResults}>
                    No users found matching your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Previous
            </Button>
            
            <div className={styles.pageNumbers}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`${styles.pageNumberButton} ${currentPage === page ? styles.activePage : ''}`}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </Card>
      
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onStatusChange={handleStatusChange}
          onRoleChange={handleRoleChange}
          onTypeChange={handleTypeChange}
        />
      )}

      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onAddUser={handleAddUser}
        />
      )}
    </div>
  );
};

export default Users;