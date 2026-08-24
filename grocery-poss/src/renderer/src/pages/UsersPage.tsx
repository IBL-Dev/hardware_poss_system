import React, { useEffect, useMemo, useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { DataTable, Column } from '../components/common/DataTable'
import { Loader } from '../components/common/Loader'
import { UserModal, UserFormData } from '../components/users/UserModal'
import { useConfirm } from '../context/ConfirmContext'
import { useToast } from '../context/ToastContext'
import { usersApi } from '../api/usersApi'
import type { CreateUserInput, UpdateUserInput, UserRecord } from '../../../shared/users'

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')

  const confirm = useConfirm()
  const toast = useToast()
  const normalizedUserSearchQuery = userSearchQuery.trim().toLowerCase()

  const filteredUsers = useMemo(() => {
    if (!normalizedUserSearchQuery) return users

    return users.filter((user) => {
      const haystack = [
        user.name,
        user.nic,
        user.email,
        user.phone,
        user.role,
        formatRole(user.role)
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedUserSearchQuery)
    })
  }, [normalizedUserSearchQuery, users])

  useEffect(() => {
    let isActive = true

    usersApi
      .list()
      .then((loadedUsers) => {
        if (isActive) {
          setUsers(loadedUsers)
        }
      })
      .catch((error) => {
        if (isActive) {
          toast.error(getErrorMessage(error))
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [toast])

  const columns: Column<UserRecord>[] = [
    {
      key: 'id',
      header: 'ID',
      render: (item) => (
        <span className="rounded-full bg-subtle px-2.5 py-1 text-xs font-semibold text-muted">
          #{item.id}
        </span>
      )
    },
    {
      key: 'name',
      header: 'NAME',
      render: (item) => <span className="font-semibold text-ink">{item.name}</span>
    },
    { key: 'nic', header: 'NIC' },
    { key: 'email', header: 'EMAIL' },
    { key: 'phone', header: 'PHONE' },
    {
      key: 'role',
      header: 'ROLE',
      render: (item) => (
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getRoleBadgeClass(
            item.role
          )}`}
        >
          {formatRole(item.role)}
        </span>
      )
    },
    { key: 'createdAt', header: 'DATE', render: (item) => formatDate(item.createdAt) }
  ]

  const handleAddClick = (): void => {
    setEditingUser(null)
    setIsModalOpen(true)
  }

  const handleEdit = (user: UserRecord): void => {
    setEditingUser(user)
    setIsModalOpen(true)
  }

  const handleModalClose = (): void => {
    if (isSaving) return
    setIsModalOpen(false)
    setEditingUser(null)
  }

  const handleSave = async (data: UserFormData): Promise<void> => {
    setIsSaving(true)
    try {
      if (editingUser) {
        const payload: UpdateUserInput = {
          name: data.name,
          nic: data.nic,
          email: data.email,
          phone: data.phone,
          role: data.role,
          ...(data.password || data.confirmPassword
            ? { password: data.password, confirmPassword: data.confirmPassword }
            : {})
        }
        const updatedUser = await usersApi.update(editingUser.id, payload)
        setUsers((prev) => prev.map((user) => (user.id === editingUser.id ? updatedUser : user)))
        toast.success(`"${data.name}" was updated successfully.`)
      } else {
        const payload: CreateUserInput = {
          name: data.name,
          nic: data.nic,
          email: data.email,
          phone: data.phone,
          role: data.role,
          password: data.password,
          confirmPassword: data.confirmPassword
        }
        const createdUser = await usersApi.create(payload)
        setUsers((prev) => [createdUser, ...prev])
        toast.success(`"${data.name}" was added successfully.`)
      }
      setIsModalOpen(false)
      setEditingUser(null)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const deleteUser = async (user: UserRecord): Promise<void> => {
    try {
      await usersApi.delete(user.id)
      setUsers((prev) => prev.filter((item) => item.id !== user.id))
      toast.success(`"${user.name}" was deleted successfully.`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const handleDelete = (user: UserRecord): void => {
    confirm({
      title: 'Delete User',
      message: `Are you sure you want to delete "${user.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => deleteUser(user)
    })
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Users</h1>
          <p className="mt-1 text-[0.95rem] text-muted">Manage staff accounts</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-2 rounded-md border border-line bg-white px-3 py-2.5 transition-shadow focus-within:border-primary focus-within:shadow-md sm:w-80">
            <Search size={18} className="shrink-0 text-primary" />
            <input
              type="text"
              className="min-w-0 flex-1 border-none bg-transparent text-sm font-medium text-ink outline-none placeholder:text-faint"
              placeholder="Search user by name, phone, or email"
              value={userSearchQuery}
              onChange={(event) => setUserSearchQuery(event.target.value)}
            />
            {userSearchQuery.length > 0 && (
              <button
                type="button"
                className="rounded-md p-1 text-muted transition-colors hover:bg-hover hover:text-ink"
                onClick={() => setUserSearchQuery('')}
                title="Clear user search"
                aria-label="Clear user search"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <button
            className="flex items-center justify-center gap-2 rounded-md bg-success px-4 py-2.5 text-[0.95rem] font-semibold text-white transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-success-hover"
            onClick={handleAddClick}
          >
            <Plus size={18} />
            Add User
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-line bg-card p-6">
          <Loader label="Loading users..." size="sm" />
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-lg border border-line bg-card p-6 text-center text-muted">
          No users found.
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-lg border border-line bg-card p-6 text-center text-muted">
          No users match your search.
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredUsers}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <UserModal
        isOpen={isModalOpen}
        initialData={
          editingUser
            ? {
                name: editingUser.name,
                nic: editingUser.nic,
                email: editingUser.email,
                phone: editingUser.phone,
                role: editingUser.role
              }
            : undefined
        }
        isSaving={isSaving}
        onClose={handleModalClose}
        onSave={handleSave}
      />
    </div>
  )
}

export default UsersPage

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function formatDate(value: string): string {
  const date = new Date(value.replace(' ', 'T'))

  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

function formatRole(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase()
}

function getRoleBadgeClass(value: string): string {
  if (value === 'ADMIN') return 'border border-accent/20 bg-accent/10 text-accent'
  if (value === 'MANAGER') return 'border border-primary/20 bg-primary/10 text-primary'

  return 'border border-success/20 bg-success/10 text-success'
}
