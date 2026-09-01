'use client';
import React, { useEffect, useState } from 'react';
import { Settings, Users2, Shield, Plus, Check } from 'lucide-react';

export default function SettingsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [orgData, setOrgData] = useState<any>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    title: 'Security Analyst',
    roleName: 'LEAD_HUNTER',
  });

  const loadData = () => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setUsers(d))
      .catch(() => {});
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => d && setOrgData(d))
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    }).catch(() => null);
    if (res?.ok) {
      setIsAddUserOpen(false);
      setNewUser({ name: '', email: '', password: '', title: 'Security Analyst', roleName: 'LEAD_HUNTER' });
      loadData();
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgName: orgData?.organization?.name,
        orgDescription: orgData?.organization?.description,
        settings: orgData?.settings || {},
      }),
    }).catch(() => null);
    if (res?.ok) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-charcoal-800">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center space-x-3">
          <Settings className="w-6 h-6 text-jade-400" />
          <span>Organization & RBAC Settings</span>
        </h1>
        <p className="text-xs text-gray-400 font-mono mt-1">
          Manage organization policies, user access roles, and system configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Management */}
        <div className="bg-charcoal-900 border border-charcoal-700 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-100 flex items-center space-x-2">
                <Users2 className="w-4 h-4 text-jade-400" />
                <span>User & Role Management</span>
              </h2>
              <p className="text-[11px] text-gray-400 font-mono mt-0.5">{users.length} configured analyst(s)</p>
            </div>
            <button
              onClick={() => setIsAddUserOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-jade-600 hover:bg-jade-500 text-white rounded-lg text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Analyst</span>
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {users.length === 0 && (
              <div className="py-6 text-center text-xs text-gray-500 font-mono">No users found</div>
            )}
            {users.map((u) => {
              const role = u.userRoles?.[0]?.role?.name || 'LEAD_HUNTER';
              return (
                <div
                  key={u.id}
                  className="p-3 bg-charcoal-950 border border-charcoal-800 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold text-gray-200">{u.name}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{u.email} · {u.title || 'Analyst'}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                      role === 'SECURITY_ADMIN'
                        ? 'bg-jade-900/50 text-jade-300 border-jade-700'
                        : 'bg-blue-900/50 text-blue-300 border-blue-700'
                    }`}
                  >
                    {role.replace('_', ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Organization Settings */}
        <div className="bg-charcoal-900 border border-charcoal-700 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-gray-100 flex items-center space-x-2 mb-4">
            <Shield className="w-4 h-4 text-jade-400" />
            <span>Organization Governance Policies</span>
          </h2>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Organization Name</label>
              <input
                value={orgData?.organization?.name || ''}
                onChange={(e) =>
                  setOrgData({
                    ...orgData,
                    organization: { ...orgData?.organization, name: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 focus:border-jade-500 focus:outline-none"
              />
            </div>
            <div className="p-3 bg-charcoal-950 border border-charcoal-800 rounded-lg space-y-2 text-xs font-mono">
              <div className="flex justify-between text-gray-300">
                <span>Audit Log Retention</span>
                <span className="text-jade-400 font-bold">365 Days</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Mandatory SOAR Approval</span>
                <span className="text-emerald-400 font-bold">ENFORCED</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>AI Boundary</span>
                <span className="text-emerald-400 font-bold">isAdvisory: true</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Self-Approval Prevention</span>
                <span className="text-emerald-400 font-bold">ENFORCED</span>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="flex items-center space-x-2 px-4 py-2 bg-jade-600 hover:bg-jade-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {isSaved && <Check className="w-3.5 h-3.5" />}
                <span>{isSaved ? 'Saved!' : 'Save Settings'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-charcoal-950/80">
          <div className="w-full max-w-lg bg-charcoal-900 border border-charcoal-700 rounded-2xl p-6">
            <h3 className="text-base font-bold text-gray-100 mb-4">Provision New SOC Analyst</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              {[
                { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Jordan Hayes' },
                { label: 'Email Address', key: 'email', type: 'email', placeholder: 'jordan@sumitah.local' },
                { label: 'Initial Password', key: 'password', type: 'password', placeholder: 'Min 8 characters' },
                { label: 'Job Title', key: 'title', type: 'text', placeholder: 'Security Analyst' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">{label}</label>
                  <input
                    required={key !== 'title'}
                    type={type}
                    placeholder={placeholder}
                    value={(newUser as any)[key]}
                    onChange={(e) => setNewUser({ ...newUser, [key]: e.target.value })}
                    className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:border-jade-500 focus:outline-none"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Role</label>
                <select
                  value={newUser.roleName}
                  onChange={(e) => setNewUser({ ...newUser, roleName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-charcoal-950 border border-charcoal-700 rounded-lg text-sm text-gray-100 focus:border-jade-500 focus:outline-none"
                >
                  <option value="LEAD_HUNTER">Lead Hunter (Hunting, Cases, SOAR Request)</option>
                  <option value="SECURITY_ADMIN">Security Admin (Full Access + SOAR Approve)</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-3 border-t border-charcoal-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 text-gray-400 hover:text-gray-200 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-jade-600 hover:bg-jade-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}