import React, { useState } from 'react';
import { Role, RolePermissions, User, Language } from '../types';
import { 
  Shield, 
  Users2, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Edit3, 
  KeyRound, 
  AlertTriangle, 
  Search, 
  BookMarked, 
  Users, 
  ArrowRightLeft, 
  FileBarChart2, 
  DatabaseBackup, 
  Settings,
  HelpCircle
} from 'lucide-react';

interface RoleManagementProps {
  roles: Role[];
  users: User[];
  currentUser: User;
  language: Language;
  onAddRole: (role: Role) => Promise<void> | void;
  onUpdateRole: (role: Role) => Promise<void> | void;
  onDeleteRole: (roleId: string) => Promise<void> | void;
  onUpdateUserRole: (userId: string, roleId: string) => Promise<void> | void;
  onUpdateUserName?: (userId: string, newName: string) => Promise<void> | void;
}

export default function RoleManagement({
  roles,
  users,
  currentUser,
  language,
  onAddRole,
  onUpdateRole,
  onDeleteRole,
  onUpdateUserRole,
  onUpdateUserName
}: RoleManagementProps) {
  const [activeTab, setActiveTab] = useState<'roles' | 'users'>('roles');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('admin');
  const [isCreating, setIsCreating] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [roleSearchQuery, setRoleSearchQuery] = useState('');

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserName, setEditingUserName] = useState<string>('');

  // Form states for creating a new role
  const [newRoleId, setNewRoleId] = useState('');
  const [newRoleNameKh, setNewRoleNameKh] = useState('');
  const [newRoleNameEn, setNewRoleNameEn] = useState('');
  const [newPermissions, setNewPermissions] = useState<RolePermissions>({
    manageBooks: false,
    manageStudents: false,
    borrowReturn: false,
    viewReports: false,
    manageRoles: false,
    systemBackup: false
  });

  const t = {
    title: language === 'kh' ? 'គ្រប់គ្រងតួនាទី និងសិទ្ធិ' : 'Role & Permission Management',
    subTitle: language === 'kh' ? 'កំណត់តួនាទី កែសម្រួលសិទ្ធិដំណើរការ និងចាត់ចែងតួនាទីដល់គណនីអ្នកប្រើប្រាស់' : 'Define roles, configure permissions, and assign roles to operators',
    tabRoles: language === 'kh' ? 'គ្រប់គ្រងតួនាទី' : 'Manage Roles',
    tabUsers: language === 'kh' ? 'ចាត់ចែងតួនាទីសមាជិក' : 'User Role Assignments',
    roleList: language === 'kh' ? 'បញ្ជីតួនាទីទាំងអស់' : 'All Roles',
    addRole: language === 'kh' ? 'បង្កើតតួនាទីថ្មី' : 'Create Custom Role',
    permissions: language === 'kh' ? 'ការអនុញ្ញាត/សិទ្ធិដំណើរការ' : 'Access Permissions',
    saveChanges: language === 'kh' ? 'រក្សាទុកការផ្លាស់ប្តូរ' : 'Save Changes',
    roleNameKh: language === 'kh' ? 'ឈ្មោះតួនាទី (ភាសាខ្មែរ)' : 'Role Name (Khmer)',
    roleNameEn: language === 'kh' ? 'ឈ្មោះតួនាទី (English)' : 'Role Name (English)',
    roleId: language === 'kh' ? 'កូដសម្គាល់តួនាទី (ID / Slug)' : 'Role Identifier (ID / Slug)',
    systemRole: language === 'kh' ? 'តួនាទីប្រព័ន្ធ (មិនអាចលុប)' : 'System Role (Cannot delete)',
    customRole: language === 'kh' ? 'តួនាទីផ្ទាល់ខ្លួន' : 'Custom Role',
    usersCount: language === 'kh' ? 'ចំនួនសមាជិក' : 'Members Count',
    assignedUsers: language === 'kh' ? 'បញ្ជីសមាជិកប្រើតួនាទីនេះ' : 'Users holding this role',
    noUsers: language === 'kh' ? 'មិនមានសមាជិកប្រើតួនាទីនេះទេ' : 'No users currently hold this role',
    dangerZone: language === 'kh' ? 'តំបន់គ្រោះថ្នាក់' : 'Danger Zone',
    deleteRole: language === 'kh' ? 'លុបតួនាទីនេះចេញ' : 'Delete Role',
    deleteWarn: language === 'kh' ? 'តើអ្នកប្រាកដជាចង់លុបតួនាទីនេះមែនទេ? ការលុបមិនអាចសង្គ្រោះវិញបានឡើយ។' : 'Are you sure you want to delete this role? This action cannot be undone.',
    deleteActiveWarn: language === 'kh' ? 'មិនអាចលុបតួនាទីនេះបានទេ ពីព្រោះមានសមាជិកកំពុងប្រើប្រាស់វា។ សូមប្តូរតួនាទីសមាជិកទាំងនោះជាមុនសិន។' : 'Cannot delete this role because it is currently assigned to users. Reassign those users first.',
    adminPrivilegeRequired: language === 'kh' ? 'អ្នកត្រូវការសិទ្ធិជា Admin ដើម្បីកែសម្រួលផ្នែកនេះ។' : 'You need Admin privileges to modify role configurations.',
    searchUsers: language === 'kh' ? 'ស្វែងរកគណនី...' : 'Search operators...',
    userName: language === 'kh' ? 'ឈ្មោះសមាជិក' : 'Name',
    userRole: language === 'kh' ? 'តួនាទីបច្ចុប្បន្ន' : 'Current Role',
    lastActive: language === 'kh' ? 'សកម្មភាពចុងក្រោយ' : 'Last Login',
    changeRole: language === 'kh' ? 'ផ្លាស់ប្តូរតួនាទី' : 'Change Role',
    successSaved: language === 'kh' ? 'បានរក្សាទុកដោយជោគជ័យ!' : 'Changes saved successfully!',
    successDeleted: language === 'kh' ? 'បានលុបតួនាទីដោយជោគជ័យ!' : 'Role deleted successfully!',
    successCreated: language === 'kh' ? 'បានបង្កើតតួនាទីថ្មីដោយជោគជ័យ!' : 'Custom role created successfully!',
    successUserUpdated: language === 'kh' ? 'បានធ្វើបច្ចុប្បន្នភាពតួនាទីសមាជិកដោយជោគជ័យ!' : 'User role updated successfully!'
  };

  const permissionLabels: { key: keyof RolePermissions; titleKh: string; titleEn: string; descKh: string; descEn: string; icon: any }[] = [
    { 
      key: 'manageBooks', 
      titleKh: 'គ្រប់គ្រងសៀវភៅ និងប្រភេទ', 
      titleEn: 'Manage Books & Categories',
      descKh: 'អនុញ្ញាតឱ្យបន្ថែម កែសម្រួល និងលុបសៀវភៅ ឬប្រភេទសៀវភៅ', 
      descEn: 'Permission to add, edit, or delete books and genres/categories',
      icon: BookMarked 
    },
    { 
      key: 'manageStudents', 
      titleKh: 'គ្រប់គ្រងព័ត៌មានសិស្ស', 
      titleEn: 'Manage Students',
      descKh: 'អនុញ្ញាតឱ្យបន្ថែម កែសម្រួល និងលុបបញ្ជីសិស្ស', 
      descEn: 'Permission to add, edit, and delete student library directories',
      icon: Users 
    },
    { 
      key: 'borrowReturn', 
      titleKh: 'ដំណើរការខ្ចី និងសងសៀវភៅ', 
      titleEn: 'Borrow & Return System',
      descKh: 'អនុញ្ញាតឱ្យខ្ចី សងសៀវភៅ រាយការណ៍បាត់បង់ និងស្កេនបារកូដ', 
      descEn: 'Allows recording borrow loans, returns, lost books, and camera scanning',
      icon: ArrowRightLeft 
    },
    { 
      key: 'viewReports', 
      titleKh: 'មើលរបាយការណ៍ និងស្ថិតិ', 
      titleEn: 'View Reports & Statistics',
      descKh: 'សិទ្ធិចូលមើលទិន្នន័យ ស្ថិតិ ក្រាហ្វ និងនាំចេញឯកសារ PDF/Excel', 
      descEn: 'Enables viewing reports, active filters, charts, and generating PDF files',
      icon: FileBarChart2 
    },
    { 
      key: 'manageRoles', 
      titleKh: 'គ្រប់គ្រងតួនាទី និងសិទ្ធិ (Role Management)', 
      titleEn: 'Manage Roles & Permissions',
      descKh: 'សិទ្ធិខ្ពស់បំផុតក្នុងការបង្កើតតួនាទីថ្មី និងចាត់ចែងសិទ្ធិដល់គណនីដទៃ', 
      descEn: 'Superuser permission to define roles and configure system-wide access levels',
      icon: Settings 
    },
    { 
      key: 'systemBackup', 
      titleKh: 'ទាញយក និងស្តារទិន្នន័យ (Backup / Restore)', 
      titleEn: 'Database Backup & Restore',
      descKh: 'អនុញ្ញាតឱ្យទាញយកកូដ ឬស្តារមូលដ្ឋានទិន្នន័យពី JSON Backup', 
      descEn: 'Allows backing up entire library dataset or restoring from external files',
      icon: DatabaseBackup 
    },
  ];

  const selectedRole = roles.find(r => r.id === selectedRoleId);
  const currentOperatorHasAdmin = currentUser.role === 'admin' || 
    roles.find(r => r.id === currentUser.role)?.permissions.manageRoles === true;

  const handleTogglePermission = async (permKey: keyof RolePermissions) => {
    if (!currentOperatorHasAdmin) return;
    if (!selectedRole) return;

    // Check system integrity: avoid locking out of managing roles if we are editing the admin role
    if (selectedRole.id === 'admin' && permKey === 'manageRoles') {
      alert(language === 'kh' ? 'មិនអាចបិទសិទ្ធិគ្រប់គ្រងតួនាទីសម្រាប់គណនី Admin បានទេ!' : 'Cannot revoke manageRoles permission from System Administrator.');
      return;
    }

    const updatedRole: Role = {
      ...selectedRole,
      permissions: {
        ...selectedRole.permissions,
        [permKey]: !selectedRole.permissions[permKey]
      }
    };

    await onUpdateRole(updatedRole);
  };

  const handleUpdateRoleNames = async (nameKh: string, nameEn: string) => {
    if (!currentOperatorHasAdmin || !selectedRole) return;
    const updatedRole: Role = {
      ...selectedRole,
      nameKh,
      nameEn
    };
    await onUpdateRole(updatedRole);
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOperatorHasAdmin) return;
    if (!newRoleId.trim() || !newRoleNameKh.trim() || !newRoleNameEn.trim()) return;

    const formattedId = newRoleId.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    
    if (roles.some(r => r.id === formattedId)) {
      alert(language === 'kh' ? 'កូដសម្គាល់តួនាទីនេះមានរួចហើយ!' : 'Role ID already exists!');
      return;
    }

    const newRole: Role = {
      id: formattedId,
      nameKh: newRoleNameKh,
      nameEn: newRoleNameEn,
      permissions: newPermissions,
      isSystem: false
    };

    await onAddRole(newRole);
    
    // Reset form
    setNewRoleId('');
    setNewRoleNameKh('');
    setNewRoleNameEn('');
    setNewPermissions({
      manageBooks: false,
      manageStudents: false,
      borrowReturn: false,
      viewReports: false,
      manageRoles: false,
      systemBackup: false
    });
    setIsCreating(false);
    setSelectedRoleId(formattedId);
  };

  const handleDeleteRoleClick = async () => {
    if (!selectedRole || selectedRole.isSystem) return;
    
    // Check if any users have this role
    const activeUsers = users.filter(u => u.role === selectedRole.id);
    if (activeUsers.length > 0) {
      alert(t.deleteActiveWarn);
      return;
    }

    if (confirm(t.deleteWarn)) {
      await onDeleteRole(selectedRole.id);
      setSelectedRoleId('librarian');
    }
  };

  const handleUserRoleChange = async (userId: string, targetRoleId: string) => {
    if (!currentOperatorHasAdmin) return;
    
    // Prevent self-demotion: if current user changes their own role from a superuser role
    if (userId === currentUser.id && currentUser.role === 'admin' && targetRoleId !== 'admin') {
      const activeAdminsCount = users.filter(u => u.role === 'admin').length;
      if (activeAdminsCount <= 1) {
        alert(language === 'kh' ? 'អ្នកជាអ្នកគ្រប់គ្រង (Admin) តែម្នាក់គត់។ មិនអាចប្តូរតួនាទីខ្លួនឯងបានទេ ត្រូវតែមាន Admin ម្នាក់ផ្សេងទៀត។' : 'You are the only Administrator left. You cannot demote yourself unless another Admin exists.');
        return;
      }
    }

    await onUpdateUserRole(userId, targetRoleId);
  };

  const handleSaveName = async (userId: string) => {
    if (!editingUserName.trim()) return;
    if (onUpdateUserName) {
      await onUpdateUserName(userId, editingUserName.trim());
    }
    setEditingUserId(null);
  };

  // Filters
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const filteredRoles = roles.filter(r =>
    r.nameKh.toLowerCase().includes(roleSearchQuery.toLowerCase()) ||
    r.nameEn.toLowerCase().includes(roleSearchQuery.toLowerCase()) ||
    r.id.toLowerCase().includes(roleSearchQuery.toLowerCase())
  );

  // Statistics
  const adminCount = users.filter(u => u.role === 'admin').length;
  const customRoleCount = roles.filter(r => !r.isSystem).length;
  const totalOperatorsCount = users.length;

  return (
    <div id="role-management-section" className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/40 border border-white/60 p-6 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-2xl shadow-sm">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">{t.title}</h1>
            <p className="text-xs text-slate-500 font-bold mt-0.5">{t.subTitle}</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100/80 p-1 rounded-2xl self-start sm:self-center border border-slate-200/40">
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'roles' 
                ? 'bg-white text-slate-800 shadow-md border border-slate-100' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{t.tabRoles}</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'users' 
                ? 'bg-white text-slate-800 shadow-md border border-slate-100' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users2 className="w-3.5 h-3.5" />
            <span>{t.tabUsers}</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel rounded-2xl p-4 border border-white/60 shadow-sm flex items-center gap-3 bg-white/20">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{language === 'kh' ? 'តួនាទីសរុប' : 'Total Roles'}</p>
            <p className="text-lg font-black text-slate-800 mt-0.5">{roles.length}</p>
          </div>
        </div>
        <div className="glass-panel rounded-2xl p-4 border border-white/60 shadow-sm flex items-center gap-3 bg-white/20">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{language === 'kh' ? 'តួនាទីបង្កើតបន្ថែម' : 'Custom Defined Roles'}</p>
            <p className="text-lg font-black text-slate-800 mt-0.5">{customRoleCount}</p>
          </div>
        </div>
        <div className="glass-panel rounded-2xl p-4 border border-white/60 shadow-sm flex items-center gap-3 bg-white/20">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Users2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{language === 'kh' ? 'សមាជិកប្រតិបត្តិការសរុប' : 'Total Operators'}</p>
            <p className="text-lg font-black text-slate-800 mt-0.5">{totalOperatorsCount} ({adminCount} Admin)</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'roles' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Roles list & add role */}
          <div className="lg:col-span-4 space-y-4">
            <div className="glass-panel rounded-3xl p-5 border border-white/60 shadow-sm flex flex-col h-full bg-white/30">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">{t.roleList}</h2>
                {currentOperatorHasAdmin && !isCreating && (
                  <button
                    onClick={() => setIsCreating(true)}
                    className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center transition shadow shadow-blue-500/15 cursor-pointer"
                    title={t.addRole}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Search Roles */}
              <div className="relative mb-4">
                <Search className="absolute inset-y-0 left-0 pl-3 w-4.5 h-4.5 text-slate-400 self-center my-auto pointer-events-none" />
                <input
                  type="text"
                  placeholder={language === 'kh' ? 'ស្វែងរកតួនាទី...' : 'Search roles...'}
                  value={roleSearchQuery}
                  onChange={(e) => setRoleSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 w-full text-xs font-bold rounded-xl border border-slate-200/60 focus:outline-none transition bg-white/60 focus:bg-white"
                />
              </div>

              {/* Roles list */}
              <div className="space-y-2 overflow-y-auto max-h-[360px] pr-1">
                {filteredRoles.map(role => {
                  const isActive = selectedRoleId === role.id;
                  const activeMembersCount = users.filter(u => u.role === role.id).length;
                  return (
                    <button
                      key={role.id}
                      onClick={() => {
                        setSelectedRoleId(role.id);
                        setIsCreating(false);
                      }}
                      className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-blue-50 border-blue-200 text-blue-900 shadow-sm'
                          : 'bg-white/40 hover:bg-white border-slate-200/50 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <p className="text-xs font-black truncate">{language === 'kh' ? role.nameKh : role.nameEn}</p>
                        <p className="text-[9px] font-mono font-bold text-slate-400 mt-0.5 truncate">
                          ID: {role.id} {role.isSystem && `• ${language === 'kh' ? 'ប្រព័ន្ធ' : 'System'}`}
                        </p>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        activeMembersCount > 0 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        {activeMembersCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Role Editor or Custom Creation */}
          <div className="lg:col-span-8">
            {isCreating ? (
              /* Custom Role Creation View */
              <div className="glass-panel rounded-3xl p-6 border border-white/60 shadow-sm bg-white/40">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">{t.addRole}</h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{language === 'kh' ? 'បង្កើតតួនាទីថ្មី ជាមួយសិទ្ធិផ្ទាល់ខ្លួន' : 'Define and name a new role with a set of permissions'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsCreating(false)}
                    className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateRole} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">{t.roleId}</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., student-assistant"
                        value={newRoleId}
                        onChange={(e) => setNewRoleId(e.target.value)}
                        className="px-3.5 py-2.5 w-full text-xs font-bold rounded-xl border border-slate-200/80 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition glass-input bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">{t.roleNameKh}</label>
                      <input
                        type="text"
                        required
                        placeholder="ឧ. ជំនួយការសិស្ស"
                        value={newRoleNameKh}
                        onChange={(e) => setNewRoleNameKh(e.target.value)}
                        className="px-3.5 py-2.5 w-full text-xs font-bold rounded-xl border border-slate-200/80 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition glass-input bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">{t.roleNameEn}</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Student Assistant"
                        value={newRoleNameEn}
                        onChange={(e) => setNewRoleNameEn(e.target.value)}
                        className="px-3.5 py-2.5 w-full text-xs font-bold rounded-xl border border-slate-200/80 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition glass-input bg-white"
                      />
                    </div>
                  </div>

                  {/* Permissions Selection Grid */}
                  <div>
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3.5">{t.permissions}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {permissionLabels.map(p => {
                        const Icon = p.icon;
                        const isChecked = newPermissions[p.key];
                        return (
                          <div
                            key={p.key}
                            onClick={() => setNewPermissions(prev => ({ ...prev, [p.key]: !prev[p.key] }))}
                            className={`p-3.5 rounded-2xl border transition flex items-start gap-3 cursor-pointer ${
                              isChecked
                                ? 'bg-indigo-50/40 border-indigo-200 text-indigo-900 shadow-sm'
                                : 'bg-white/55 hover:bg-white border-slate-100 hover:border-slate-200 text-slate-600'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg shrink-0 ${isChecked ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black truncate">{language === 'kh' ? p.titleKh : p.titleEn}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-0.5">{language === 'kh' ? p.descKh : p.descEn}</p>
                            </div>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                              isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition"
                    >
                      {language === 'kh' ? 'បោះបង់' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition shadow shadow-indigo-500/20"
                    >
                      {t.addRole}
                    </button>
                  </div>
                </form>
              </div>
            ) : selectedRole ? (
              /* Role Edit & Details View */
              <div className="glass-panel rounded-3xl p-6 border border-white/60 shadow-sm bg-white/40 space-y-6">
                
                {/* Role Header Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                      <Shield className="w-5.5 h-5.5 animate-pulse" />
                    </div>
                    <div>
                      {currentOperatorHasAdmin ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="text"
                            value={language === 'kh' ? selectedRole.nameKh : selectedRole.nameEn}
                            onChange={(e) => {
                              if (language === 'kh') {
                                handleUpdateRoleNames(e.target.value, selectedRole.nameEn);
                              } else {
                                handleUpdateRoleNames(selectedRole.nameKh, e.target.value);
                              }
                            }}
                            className="text-base font-black text-slate-800 bg-transparent border-b border-dashed border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:outline-none py-0.5"
                          />
                        </div>
                      ) : (
                        <h3 className="text-base font-black text-slate-800">{language === 'kh' ? selectedRole.nameKh : selectedRole.nameEn}</h3>
                      )}
                      <p className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">
                        Role Code: {selectedRole.id} &bull; {selectedRole.isSystem ? t.systemRole : t.customRole}
                      </p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                      selectedRole.isSystem 
                        ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                    }`}>
                      {selectedRole.isSystem ? 'System Core' : 'Custom Added'}
                    </span>
                  </div>
                </div>

                {/* Permissions Grid Checklist */}
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span>{t.permissions}</span>
                    <span title={language === 'kh' ? 'កែសម្រួលដើម្បីបិទ/បើកដំណើរការសិទ្ធិ' : 'Toggle access flags'}>
                      <HelpCircle className="w-4 h-4 text-slate-400" />
                    </span>
                  </h4>

                  {!currentOperatorHasAdmin && (
                    <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl text-xs font-bold mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{t.adminPrivilegeRequired}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {permissionLabels.map(p => {
                      const Icon = p.icon;
                      const isChecked = selectedRole.permissions[p.key];
                      const disabled = !currentOperatorHasAdmin || (selectedRole.id === 'admin' && p.key === 'manageRoles');
                      
                      return (
                        <div
                          key={p.key}
                          onClick={() => {
                            if (!disabled) handleTogglePermission(p.key);
                          }}
                          className={`p-4 rounded-2xl border transition flex items-start gap-3.5 select-none ${
                            isChecked
                              ? 'bg-blue-50/30 border-blue-100 text-blue-900 shadow-sm'
                              : 'bg-white/45 border-slate-100 hover:border-slate-200 text-slate-600'
                          } ${disabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:shadow-md'}`}
                        >
                          <div className={`p-1.5 rounded-lg shrink-0 ${isChecked ? 'bg-blue-100 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                            <Icon className="w-4.5 h-4.5" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black truncate">{language === 'kh' ? p.titleKh : p.titleEn}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">{language === 'kh' ? p.descKh : p.descEn}</p>
                          </div>

                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                            isChecked 
                              ? 'bg-blue-600 border-blue-600 text-white' 
                              : 'border-slate-300 bg-white'
                          }`}>
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Danger Zone for Custom roles */}
                {!selectedRole.isSystem && currentOperatorHasAdmin && (
                  <div className="pt-6 border-t border-slate-100">
                    <h4 className="text-xs font-black text-rose-600 uppercase tracking-widest mb-3">{t.dangerZone}</h4>
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-black text-slate-800">{t.deleteRole}</p>
                        <p className="text-[10px] font-bold text-rose-600/80 mt-0.5">
                          {language === 'kh' ? 'លុបតួនាទីចេញពីប្រព័ន្ធជាអចិន្ត្រៃយ៍' : 'Permanently remove this custom role configuration'}
                        </p>
                      </div>
                      <button
                        onClick={handleDeleteRoleClick}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow shadow-rose-500/15 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t.deleteRole}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        /* User Assignment Tab View */
        <div className="glass-panel rounded-3xl p-6 border border-white/60 shadow-sm bg-white/40 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">{t.tabUsers}</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                {language === 'kh' ? 'ចាត់តាំងតួនាទីផ្សេងៗដល់សមាជិកប្រតិបត្តិការសាលា' : 'Map library operators to defined roles'}
              </p>
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute inset-y-0 left-0 pl-3 w-4.5 h-4.5 text-slate-400 self-center my-auto pointer-events-none" />
              <input
                type="text"
                placeholder={t.searchUsers}
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 w-full text-xs font-bold rounded-xl border border-slate-200/60 focus:outline-none transition bg-white/60 focus:bg-white"
              />
            </div>
          </div>

          {/* Table list of members */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-150 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th className="py-3 px-4">{t.userName}</th>
                  <th className="py-3 px-4">{language === 'kh' ? 'គណនី / យូស័រ' : 'Username'}</th>
                  <th className="py-3 px-4">{t.userRole}</th>
                  <th className="py-3 px-4">{t.lastActive}</th>
                  {currentOperatorHasAdmin && <th className="py-3 px-4 text-right">{t.changeRole}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredUsers.map(user => {
                  const roleObj = roles.find(r => r.id === user.role);
                  const isCurrentOperator = user.id === currentUser.id;

                  return (
                    <tr key={user.id} className="hover:bg-white/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-black text-blue-600 text-xs uppercase shadow-sm">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            {editingUserId === user.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={editingUserName}
                                  onChange={(e) => setEditingUserName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveName(user.id);
                                    if (e.key === 'Escape') setEditingUserId(null);
                                  }}
                                  className="px-2 py-1 text-xs font-bold border border-blue-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-800"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveName(user.id)}
                                  className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition shadow-sm cursor-pointer animate-pulse"
                                  title={language === 'kh' ? 'រក្សាទុក' : 'Save'}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingUserId(null)}
                                  className="p-1 bg-slate-400 hover:bg-slate-500 text-white rounded-lg transition shadow-sm cursor-pointer"
                                  title={language === 'kh' ? 'បោះបង់' : 'Cancel'}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 group">
                                <span className="font-black text-slate-800">{user.name}</span>
                                {(currentOperatorHasAdmin || isCurrentOperator) && (
                                  <button
                                    onClick={() => {
                                      setEditingUserId(user.id);
                                      setEditingUserName(user.name);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-blue-600 rounded-lg transition cursor-pointer"
                                    title={language === 'kh' ? 'កែសម្រួលឈ្មោះ' : 'Edit name'}
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {isCurrentOperator && (
                                  <span className="ml-1.5 inline-flex px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-black uppercase whitespace-nowrap">
                                    {language === 'kh' ? 'គណនីអ្នក' : 'You'}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                        @{user.username}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-black border uppercase tracking-wider ${
                          user.role === 'admin'
                            ? 'bg-rose-50 text-rose-700 border-rose-100'
                            : user.role === 'librarian'
                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                        }`}>
                          {roleObj ? (language === 'kh' ? roleObj.nameKh : roleObj.nameEn) : user.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                        {user.lastLogin || 'N/A'}
                      </td>
                      {currentOperatorHasAdmin && (
                        <td className="py-3.5 px-4 text-right">
                          <select
                            value={user.role}
                            disabled={!currentOperatorHasAdmin}
                            onChange={(e) => handleUserRoleChange(user.id, e.target.value)}
                            className="text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:outline-none cursor-pointer focus:ring-1 focus:ring-blue-500 transition shadow-sm"
                          >
                            {roles.map(r => (
                              <option key={r.id} value={r.id}>
                                {language === 'kh' ? r.nameKh : r.nameEn}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">
                      {language === 'kh' ? 'រកមិនឃើញសមាជិកប្រតិបត្តិការឡើយ!' : 'No operators found!'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
