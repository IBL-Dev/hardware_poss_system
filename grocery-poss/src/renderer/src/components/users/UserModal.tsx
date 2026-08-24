import React, { useState, useRef } from 'react'
import { X, Eye, EyeOff } from 'lucide-react'
import { Spinner } from '../common/Spinner'
import type { UserRole } from '../../../../shared/users'

export interface UserFormData {
  name: string
  nic: string
  email: string
  phone: string
  role: UserRole
  password: string
  confirmPassword: string
}

interface UserModalProps {
  isOpen: boolean
  initialData?: Omit<UserFormData, 'password' | 'confirmPassword'>
  isSaving?: boolean
  onClose: () => void
  onSave: (data: UserFormData) => void
}

const emptyForm: UserFormData = {
  name: '',
  nic: '',
  email: '',
  phone: '',
  role: 'STAFF',
  password: '',
  confirmPassword: ''
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  initialData,
  isSaving = false,
  onClose,
  onSave
}) => {
  if (!isOpen) return null

  return (
    <UserModalContent
      key={initialData ? `${initialData.nic}:${initialData.email}` : 'new-user'}
      initialData={initialData}
      isSaving={isSaving}
      onClose={onClose}
      onSave={onSave}
    />
  )
}

const UserModalContent: React.FC<Omit<UserModalProps, 'isOpen'>> = ({
  initialData,
  isSaving = false,
  onClose,
  onSave
}) => {
  const [form, setForm] = useState<UserFormData>(
    initialData ? { ...initialData, password: '', confirmPassword: '' } : emptyForm
  )
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({})

  const formRef = useRef<HTMLDivElement>(null)

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof UserFormData, string>> = {}

    if (!form.name.trim()) newErrors.name = 'Full Name is required'

    const nicRegex = /^(?:[0-9]{9}[vVxX]|[0-9]{12})$/
    if (!form.nic.trim()) newErrors.nic = 'NIC is required'
    else if (!nicRegex.test(form.nic.trim()))
      newErrors.nic = 'Invalid NIC format (e.g., 991234567V or 199912345678)'

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!form.email.trim()) newErrors.email = 'Email is required'
    else if (!emailRegex.test(form.email.trim())) newErrors.email = 'Invalid email address'

    const phoneRegex = /^[0-9]{10}$/
    if (!form.phone.trim()) newErrors.phone = 'Phone number is required'
    else if (!phoneRegex.test(form.phone.trim()))
      newErrors.phone = 'Phone number must be exactly 10 digits'

    if (!initialData || form.password.length > 0 || form.confirmPassword.length > 0) {
      if (form.password.length < 6) newErrors.password = 'Password must be at least 6 characters'
      if (form.password !== form.confirmPassword)
        newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = (): void => {
    if (!validateForm()) {
      setTimeout(() => {
        const firstErrorInput = formRef.current?.querySelector(
          '[aria-invalid="true"]'
        ) as HTMLElement | null
        if (firstErrorInput) firstErrorInput.focus()
      }, 0)
      return
    }
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-ink/35 backdrop-blur-[2px]">
      <div className="flex max-h-[90vh] w-[min(92vw,34rem)] flex-col gap-5 overflow-y-auto rounded-lg bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="m-0 text-xl font-bold text-ink">
            {initialData ? 'Edit User' : 'Add User'}
          </h3>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onClose}
            disabled={isSaving}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4" ref={formRef}>
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.85rem] font-medium text-muted">Full Name</label>
            <input
              type="text"
              className={`rounded-md border bg-bg px-3 py-2.5 text-base text-ink outline-none ${errors.name ? 'border-danger' : 'border-line focus:border-primary'}`}
              placeholder="e.g. Jane Smith"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              aria-invalid={!!errors.name}
              autoFocus
            />
            {errors.name && <span className="text-[0.8rem] text-danger">{errors.name}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.85rem] font-medium text-muted">NIC</label>
            <input
              type="text"
              className={`rounded-md border bg-bg px-3 py-2.5 text-base text-ink outline-none ${errors.nic ? 'border-danger' : 'border-line focus:border-primary'}`}
              placeholder="e.g. 991234567V"
              value={form.nic}
              onChange={(e) => setForm({ ...form, nic: e.target.value })}
              aria-invalid={!!errors.nic}
            />
            {errors.nic && <span className="text-[0.8rem] text-danger">{errors.nic}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.85rem] font-medium text-muted">Email</label>
            <input
              type="email"
              className={`rounded-md border bg-bg px-3 py-2.5 text-base text-ink outline-none ${errors.email ? 'border-danger' : 'border-line focus:border-primary'}`}
              placeholder="e.g. jane.smith@mail.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              aria-invalid={!!errors.email}
            />
            {errors.email && <span className="text-[0.8rem] text-danger">{errors.email}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.85rem] font-medium text-muted">Phone</label>
            <input
              type="tel"
              className={`rounded-md border bg-bg px-3 py-2.5 text-base text-ink outline-none ${errors.phone ? 'border-danger' : 'border-line focus:border-primary'}`}
              placeholder="e.g. 0771234567"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              aria-invalid={!!errors.phone}
            />
            {errors.phone && <span className="text-[0.8rem] text-danger">{errors.phone}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.85rem] font-medium text-muted">Role</label>
            <select
              className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
            >
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="STAFF">Staff</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.85rem] font-medium text-muted">
              {initialData ? 'New Password' : 'Password'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className={`w-full rounded-md border bg-bg px-3 py-2.5 pr-10 text-base text-ink outline-none ${errors.password ? 'border-danger' : 'border-line focus:border-primary'}`}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                aria-invalid={!!errors.password}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-ink"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <span className="text-[0.8rem] text-danger">{errors.password}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.85rem] font-medium text-muted">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className={`w-full rounded-md border bg-bg px-3 py-2.5 pr-10 text-base text-ink outline-none ${errors.confirmPassword ? 'border-danger' : 'border-line focus:border-primary'}`}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                aria-invalid={!!errors.confirmPassword}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-ink"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <span className="text-[0.8rem] text-danger">{errors.confirmPassword}</span>
            )}
          </div>
        </div>

        <div className="flex w-full gap-3">
          <button
            className="flex-1 rounded-md border border-line bg-transparent py-3 text-[0.95rem] font-semibold text-ink transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary py-3 text-[0.95rem] font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving && <Spinner size={16} />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
