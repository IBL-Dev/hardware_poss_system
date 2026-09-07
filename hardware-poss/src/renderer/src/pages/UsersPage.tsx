import React, { useEffect, useMemo, useState } from 'react'
import {
  Crown,
  Plus,
  Search,
  ShieldCheck,
  UserCog,
  Users,
  UserRound,
  X
} from 'lucide-react'
import { DataTable, Column } from '../components/common/DataTable'
import { Loader } from '../components/common/Loader'
import { UserModal, UserFormData } from '../components/users/UserModal'
import { useConfirm } from '../context/ConfirmContext'
import { useToast } from '../context/ToastContext'
import { usersApi } from '../api/usersApi'
import type {
  CreateUserInput,
  UpdateUserInput,
  UserRecord
} from '../../../shared/users'

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

  /* ==========================================================
     FILTERED USERS
  ========================================================== */

  const filteredUsers = useMemo(() => {
    if (!normalizedUserSearchQuery) {
      return users
    }

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

  /* ==========================================================
     USER SUMMARY
  ========================================================== */

  const userSummary = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((user) => user.role === 'ADMIN').length,
      managers: users.filter((user) => user.role === 'MANAGER').length,
      staff: users.filter(
        (user) => user.role !== 'ADMIN' && user.role !== 'MANAGER'
      ).length
    }),
    [users]
  )

  /* ==========================================================
     LOAD USERS
  ========================================================== */

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

  /* ==========================================================
     TABLE COLUMNS
  ========================================================== */

  const columns: Column<UserRecord>[] = [
    {
      key: 'id',
      header: 'ID',
      render: (item) => (
        <span className="inline-flex min-w-[52px] items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs font-bold text-slate-500">
          #{item.id}
        </span>
      )
    },
    {
      key: 'name',
      header: 'USER',
      render: (item) => (
        <div className="flex min-w-[180px] items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50">
            <UserRound size={17} className="text-emerald-600" />
          </div>

          <div className="min-w-0">
            <span className="block truncate font-semibold text-slate-800">
              {item.name}
            </span>

            <span className="mt-0.5 block text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">
              Staff Account
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'nic',
      header: 'NIC',
      render: (item) => (
        <span className="font-mono text-[0.82rem] font-medium text-slate-600">
          {item.nic}
        </span>
      )
    },
    {
      key: 'email',
      header: 'EMAIL',
      render: (item) => (
        <span className="block max-w-[220px] truncate text-sm font-medium text-slate-600">
          {item.email}
        </span>
      )
    },
    {
      key: 'phone',
      header: 'PHONE',
      render: (item) => (
        <span className="whitespace-nowrap text-sm font-medium text-slate-600">
          {item.phone}
        </span>
      )
    },
    {
      key: 'role',
      header: 'ROLE',
      render: (item) => (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-bold ${getRoleBadgeClass(
            item.role
          )}`}
        >
          {getRoleIcon(item.role)}
          {formatRole(item.role)}
        </span>
      )
    },
    {
      key: 'createdAt',
      header: 'CREATED',
      render: (item) => (
        <span className="whitespace-nowrap text-sm font-medium text-slate-500">
          {formatDate(item.createdAt)}
        </span>
      )
    }
  ]

  /* ==========================================================
     ADD USER
  ========================================================== */

  const handleAddClick = (): void => {
    setEditingUser(null)
    setIsModalOpen(true)
  }

  /* ==========================================================
     EDIT USER
  ========================================================== */

  const handleEdit = (user: UserRecord): void => {
    setEditingUser(user)
    setIsModalOpen(true)
  }

  /* ==========================================================
     CLOSE MODAL
  ========================================================== */

  const handleModalClose = (): void => {
    if (isSaving) return

    setIsModalOpen(false)
    setEditingUser(null)
  }

  /* ==========================================================
     SAVE USER
  ========================================================== */

  const handleSave = async (
    data: UserFormData
  ): Promise<void> => {
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
            ? {
                password: data.password,
                confirmPassword: data.confirmPassword
              }
            : {})
        }

        const updatedUser = await usersApi.update(
          editingUser.id,
          payload
        )

        setUsers((prev) =>
          prev.map((user) =>
            user.id === editingUser.id
              ? updatedUser
              : user
          )
        )

        toast.success(
          `"${data.name}" was updated successfully.`
        )
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

        toast.success(
          `"${data.name}" was added successfully.`
        )
      }

      setIsModalOpen(false)
      setEditingUser(null)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  /* ==========================================================
     DELETE USER
  ========================================================== */

  const deleteUser = async (
    user: UserRecord
  ): Promise<void> => {
    try {
      await usersApi.delete(user.id)

      setUsers((prev) =>
        prev.filter((item) => item.id !== user.id)
      )

      toast.success(
        `"${user.name}" was deleted successfully.`
      )
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  /* ==========================================================
     DELETE CONFIRMATION
  ========================================================== */

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
    <div className="flex min-h-full flex-col gap-5">
      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-600 shadow-sm">
              <Users size={21} className="text-white" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Users
                </h1>

                {!isLoading && (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    {users.length} Accounts
                  </span>
                )}
              </div>

              <p className="mt-1 text-[0.92rem] text-slate-500">
                Manage hardware POS staff accounts and access roles
              </p>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm shadow-emerald-600/20 transition-all hover:-translate-y-px hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/20 active:translate-y-0"
            onClick={handleAddClick}
          >
            <Plus size={18} />
            Add User
          </button>
        </div>
      </div>

      {/* ======================================================
          USER SUMMARY
      ====================================================== */}

      {!isLoading && users.length > 0 && (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <UserSummaryCard
            label="Total Users"
            value={userSummary.total}
            icon={<Users size={19} />}
            tone="green"
          />

          <UserSummaryCard
            label="Administrators"
            value={userSummary.admins}
            icon={<Crown size={19} />}
            tone="purple"
          />

          <UserSummaryCard
            label="Managers"
            value={userSummary.managers}
            icon={<ShieldCheck size={19} />}
            tone="blue"
          />

          <UserSummaryCard
            label="Staff"
            value={userSummary.staff}
            icon={<UserCog size={19} />}
            tone="slate"
          />
        </div>
      )}

      {/* ======================================================
          SEARCH SECTION
      ====================================================== */}

      {!isLoading && users.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50">
                <Search size={14} className="text-emerald-600" />
              </div>

              <h2 className="text-sm font-bold text-slate-800">
                Search Staff
              </h2>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Displaying</span>

              <span className="rounded-md bg-emerald-50 px-2 py-1 font-bold text-emerald-700">
                {filteredUsers.length}
              </span>

              <span>of</span>

              <span className="font-bold text-slate-700">
                {users.length}
              </span>

              <span>users</span>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="group flex h-11 w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 shadow-sm transition-colors focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/10 lg:max-w-xl">
              <Search
                size={17}
                className="shrink-0 text-slate-400 transition-colors group-focus-within:text-emerald-600"
              />

              <input
                type="text"
                className="min-w-0 flex-1 border-none bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
                placeholder="Search name, NIC, email, phone or role..."
                value={userSearchQuery}
                onChange={(event) =>
                  setUserSearchQuery(event.target.value)
                }
              />

              {userSearchQuery.length > 0 && (
                <button
                  type="button"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  onClick={() => setUserSearchQuery('')}
                  title="Clear user search"
                  aria-label="Clear user search"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          USER CONTENT
      ====================================================== */}

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <Loader
            label="Loading users..."
            size="sm"
          />
        </div>
      ) : users.length === 0 ? (
        <div className="flex min-h-[330px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50">
            <Users
              size={27}
              className="text-emerald-600"
            />
          </div>

          <h3 className="text-base font-bold text-slate-800">
            No staff accounts available
          </h3>

          <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
            Add administrators, managers and POS staff members who
            need access to the hardware store management system.
          </p>

          <button
            type="button"
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
            onClick={handleAddClick}
          >
            <Plus size={17} />
            Add First User
          </button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
            <Search
              size={22}
              className="text-slate-400"
            />
          </div>

          <h3 className="font-bold text-slate-800">
            No matching users
          </h3>

          <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
            No staff accounts match your current search.
          </p>

          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
            onClick={() => setUserSearchQuery('')}
          >
            <X size={15} />
            Clear Search
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* ==================================================
              TABLE HEADER
          ================================================== */}

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
            <div className="flex items-center gap-2">
              <ShieldCheck
                size={16}
                className="text-emerald-600"
              />

              <span className="text-sm font-bold text-slate-700">
                Staff Accounts
              </span>
            </div>

            <span className="text-xs font-medium text-slate-500">
              {filteredUsers.length}{' '}
              {filteredUsers.length === 1
                ? 'account'
                : 'accounts'}
            </span>
          </div>

          {/* ==================================================
              DATA TABLE
          ================================================== */}

          <DataTable
            columns={columns}
            data={filteredUsers}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      {/* ======================================================
          USER MODAL
      ====================================================== */}

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

/* ==========================================================
   USER SUMMARY CARD
========================================================== */

const UserSummaryCard: React.FC<{
  label: string
  value: number
  icon: React.ReactNode
  tone: 'green' | 'purple' | 'blue' | 'slate'
}> = ({ label, value, icon, tone }) => (
  <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div
      className={`absolute inset-x-0 top-0 h-[3px] ${getSummaryBarClass(
        tone
      )}`}
    />

    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[0.72rem] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <p className="mt-1 text-xl font-bold tracking-tight text-slate-800">
          {value}
        </p>
      </div>

      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${getSummaryIconClass(
          tone
        )}`}
      >
        {icon}
      </div>
    </div>
  </div>
)

/* ==========================================================
   SUMMARY BAR CLASS
========================================================== */

function getSummaryBarClass(
  tone: 'green' | 'purple' | 'blue' | 'slate'
): string {
  if (tone === 'green') {
    return 'bg-emerald-500'
  }

  if (tone === 'purple') {
    return 'bg-violet-500'
  }

  if (tone === 'blue') {
    return 'bg-sky-500'
  }

  return 'bg-slate-300'
}

/* ==========================================================
   SUMMARY ICON CLASS
========================================================== */

function getSummaryIconClass(
  tone: 'green' | 'purple' | 'blue' | 'slate'
): string {
  if (tone === 'green') {
    return 'bg-emerald-50 text-emerald-600'
  }

  if (tone === 'purple') {
    return 'bg-violet-50 text-violet-600'
  }

  if (tone === 'blue') {
    return 'bg-sky-50 text-sky-600'
  }

  return 'bg-slate-100 text-slate-500'
}

/* ==========================================================
   ERROR MESSAGE
========================================================== */

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.'
}

/* ==========================================================
   FORMAT DATE
========================================================== */

function formatDate(value: string): string {
  const date = new Date(value.replace(' ', 'T'))

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString()
}

/* ==========================================================
   FORMAT ROLE
========================================================== */

function formatRole(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase()
}

/* ==========================================================
   ROLE BADGE
========================================================== */

function getRoleBadgeClass(value: string): string {
  if (value === 'ADMIN') {
    return 'border-violet-200 bg-violet-50 text-violet-700'
  }

  if (value === 'MANAGER') {
    return 'border-sky-200 bg-sky-50 text-sky-700'
  }

  return 'border-emerald-200 bg-emerald-50 text-emerald-700'
}

/* ==========================================================
   ROLE ICON
========================================================== */

function getRoleIcon(value: string): React.ReactNode {
  if (value === 'ADMIN') {
    return <Crown size={13} />
  }

  if (value === 'MANAGER') {
    return <ShieldCheck size={13} />
  }

  return <UserCog size={13} />
}