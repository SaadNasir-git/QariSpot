'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Search, User, Shield, Users, Filter, MoreVertical, Check, Clock } from 'lucide-react'
import { sileo } from 'sileo'
import axios from 'axios'

interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'moderator' | 'editor' | 'viewer'
  createdAt: string
}

const AssignRole = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [updatingRole, setUpdatingRole] = useState<number | null>(null)
  const [filteredUsers, setfilteredUsers] = useState([])

  // Dropdown state for portal
  const [dropdownState, setDropdownState] = useState<{
    userId: number
    position: { top: number; left: number }
  } | null>(null)

  const buttonRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({})

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [selectedRole])

  useEffect(() => {
    if (searchTerm.length >= 3) {
      fetchUsers()
    }
  }, [searchTerm])


  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownState && !(e.target as Element).closest('.role-dropdown-portal')) {
        setDropdownState(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownState])

  const fetchUsers = async () => {
    try {
      const response = await axios.post('/dashboard/api/users', { search: searchTerm, role: selectedRole })
      const data = await response.data;
      if (users.length > 0) {
        setfilteredUsers(data.users || [])
      } else {
        setUsers(data.users || [])
        setfilteredUsers(data.users || [])
      }
    } catch (error) {
      sileo.error({ title: 'Failed to fetch users' })
      console.log(error)
    } finally {
      setLoading(false)
    }
  }

  // Role options with colors
  const roles = [
    { value: 'admin', label: 'Admin', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
    { value: 'moderator', label: 'Moderator', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
    { value: 'editor', label: 'Editor', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
    { value: 'viewer', label: 'Viewer', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30' }
  ]

  // Handle role change for single user
  const handleRoleChange = async (userId: number, newRole: string) => {
    setUpdatingRole(userId)
    setDropdownState(null)

    try {
      const res = await axios.put('/dashboard/api/users/role', { userId, role: newRole })
      if (res.status !== 200) throw new Error('Failed to update role')

      // Update local state
      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, role: newRole as any } : user
      ))

      sileo.success({ title: 'Role updated successfully' })
    } catch (error) {
      sileo.error({ title: 'Failed to update role' })
    } finally {
      setUpdatingRole(null)
    }
  }

  // Open dropdown
  const openDropdown = (userId: number, buttonRef: HTMLButtonElement | null) => {
    if (buttonRef) {
      const rect = buttonRef.getBoundingClientRect()
      setDropdownState({
        userId,
        position: {
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX - 160 // Adjust based on dropdown width
        }
      })
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Get role styling
  const getRoleStyle = (role: string) => {
    return roles.find(r => r.value === role) || roles[3]
  }

  // Calculate stats
  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    moderators: users.filter(u => u.role === 'moderator').length,
    editors: users.filter(u => u.role === 'editor').length,
    viewers: users.filter(u => u.role === 'viewer').length
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-36 px-6 pt-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Role Assignment</h1>
          <p className="text-gray-400">Manage user roles and permissions across the platform</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {/* ... Stats cards remain the same ... */}
          <div className="bg-[#121212] rounded-xl border border-gray-800 p-6 hover:border-gray-700 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Users</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="bg-blue-500/10 p-3 rounded-lg">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-[#121212] rounded-xl border border-gray-800 p-6 hover:border-gray-700 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Admins</p>
                <p className="text-2xl font-bold text-white">{stats.admins}</p>
              </div>
              <div className="bg-purple-500/10 p-3 rounded-lg">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-[#121212] rounded-xl border border-gray-800 p-6 hover:border-gray-700 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Moderators</p>
                <p className="text-2xl font-bold text-white">{stats.moderators}</p>
              </div>
              <div className="bg-green-500/10 p-3 rounded-lg">
                <User className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-[#121212] rounded-xl border border-gray-800 p-6 hover:border-gray-700 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Editors</p>
                <p className="text-2xl font-bold text-white">{stats.editors}</p>
              </div>
              <div className="bg-yellow-500/10 p-3 rounded-lg">
                <User className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="bg-[#121212] rounded-xl border border-gray-800 p-6 hover:border-gray-700 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Viewers</p>
                <p className="text-2xl font-bold text-white">{stats.viewers}</p>
              </div>
              <div className="bg-gray-500/10 p-3 rounded-lg">
                <User className="w-6 h-6 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-[#121212] rounded-xl border border-gray-800 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="bg-[#1a1a1a] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Roles</option>
                {roles.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-[#121212] rounded-xl border border-gray-800 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800 bg-[#1a1a1a]">
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Joined</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredUsers.map((user) => {
                      const roleStyle = getRoleStyle(user.role)
                      return (
                        <tr key={user.id} className="hover:bg-[#1a1a1a] transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-semibold text-sm">
                                  {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-white font-medium">{user.name}</p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${roleStyle.bg} ${roleStyle.color} border ${roleStyle.border}`}>
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Clock className="w-4 h-4" />
                              {formatDate(user.createdAt)}
                            </div>
                          </td>
                          <td className="px-6 py-4 relative">
                            <div className="flex items-center gap-2">
                              {updatingRole === user.id ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-green-500"></div>
                              ) : (
                                <button
                                  ref={el => {
                                    buttonRefs.current[user.id] = el
                                  }}
                                  onClick={() => {
                                    if (dropdownState?.userId === user.id) {
                                      setDropdownState(null)
                                    } else {
                                      openDropdown(user.id, buttonRefs.current[user.id])
                                    }
                                  }}
                                  className="p-1.5 hover:bg-[#252525] rounded-lg transition-colors"
                                >
                                  <MoreVertical className="w-4 h-4 text-gray-400" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Empty State */}
              {filteredUsers.length === 0 && (
                <div className="text-center py-16">
                  <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-white font-medium text-lg mb-2">No users found</h3>
                  <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                </div>
              )}

              {/* Pagination */}
              {/* <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800 bg-[#1a1a1a]">
                <p className="text-sm text-gray-400">
                  Showing <span className="text-white font-medium">{filteredUsers.length}</span> of <span className="text-white font-medium">{users.length}</span> users
                </p>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 bg-[#252525] text-gray-400 rounded-lg text-sm hover:bg-[#2a2a2a] hover:text-white transition-colors disabled:opacity-50">
                    Previous
                  </button>
                  <button className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors">
                    1
                  </button>
                  <button className="px-3 py-1.5 bg-[#252525] text-gray-400 rounded-lg text-sm hover:bg-[#2a2a2a] hover:text-white transition-colors">
                    2
                  </button>
                  <button className="px-3 py-1.5 bg-[#252525] text-gray-400 rounded-lg text-sm hover:bg-[#2a2a2a] hover:text-white transition-colors">
                    3
                  </button>
                  <button className="px-3 py-1.5 bg-[#252525] text-gray-400 rounded-lg text-sm hover:bg-[#2a2a2a] hover:text-white transition-colors">
                    Next
                  </button>
                </div>
              </div> */}
            </>
          )}
        </div>
      </div>

      {/* Dropdown Portal */}
      {dropdownState && createPortal(
        <div
          className="fixed role-dropdown-portal w-48 bg-[#1a1a1a] border border-gray-800 rounded-lg shadow-xl z-[9999]"
          style={{
            top: dropdownState.position.top,
            left: dropdownState.position.left,
          }}
        >
          <div className="p-2">
            <p className="text-xs text-gray-500 px-3 py-2">Change role to:</p>
            {roles.map(role => {
              const user = users.find(u => u.id === dropdownState.userId)
              return (
                <button
                  key={role.value}
                  onClick={() => handleRoleChange(dropdownState.userId, role.value)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[#252525] rounded-lg transition-colors flex items-center justify-between group"
                >
                  <span className={role.color}>{role.label}</span>
                  {user?.role === role.value && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default AssignRole