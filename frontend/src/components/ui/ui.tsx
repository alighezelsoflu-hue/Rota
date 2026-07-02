import { ButtonHTMLAttributes, ReactNode, useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { To } from 'react-router-dom'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
type ButtonSize = 'sm' | 'md' | 'lg'

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function prettyStatus(value?: string | null) {
  if (!value) return 'Unknown'

  return value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, letter => letter.toUpperCase())
}

export function statusTone(value?: string | null): BadgeTone {
  const status = (value || '').toLowerCase()

  if (['confirmed', 'group_verified', 'active', 'accepted', 'completed', 'paid'].includes(status)) return 'success'
  if (['pending', 'forming', 'waiting', 'pending_agreement'].includes(status)) return 'neutral'
  if (['cycle_review', 'review', 'open', 'active_locked'].includes(status)) return 'warning'
  if (['disputed', 'declined', 'blocked', 'failed', 'archived'].includes(status)) return 'danger'

  return 'info'
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  full?: boolean
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  full = false,
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(
        'uiButton',
        `uiButton-${variant}`,
        `uiButton-${size}`,
        full && 'uiButtonFull',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="uiButtonSpinner" aria-hidden="true" />}
      <span>{children}</span>
    </button>
  )
}

type ButtonLinkProps = {
  to: To
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  full?: boolean
  className?: string
  ariaLabel?: string
}

export function ButtonLink({
  to,
  children,
  variant = 'primary',
  size = 'md',
  full = false,
  className,
  ariaLabel,
}: ButtonLinkProps) {
  return (
    <Link
      to={to}
      aria-label={ariaLabel}
      className={cx(
        'uiButton',
        'uiButtonLink',
        `uiButton-${variant}`,
        `uiButton-${size}`,
        full && 'uiButtonFull',
        className,
      )}
    >
      <span>{children}</span>
    </Link>
  )
}

type CardProps = {
  children: ReactNode
  eyebrow?: string
  title?: string
  description?: ReactNode
  actions?: ReactNode
  footer?: ReactNode
  className?: string
  wide?: boolean
  compact?: boolean
}

export function Card({
  children,
  eyebrow,
  title,
  description,
  actions,
  footer,
  className,
  wide = false,
  compact = false,
}: CardProps) {
  return (
    <section className={cx('uiCard', wide && 'uiCardWide', compact && 'uiCardCompact', className)}>
      {(eyebrow || title || description || actions) && (
        <div className="uiCardHeader">
          <div>
            {eyebrow && <p className="uiEyebrow">{eyebrow}</p>}
            {title && <h2>{title}</h2>}
            {description && <p className="uiCardDescription">{description}</p>}
          </div>
          {actions && <div className="uiCardActions">{actions}</div>}
        </div>
      )}

      <div className="uiCardBody">{children}</div>

      {footer && <div className="uiCardFooter">{footer}</div>}
    </section>
  )
}

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'purple'

type BadgeProps = {
  children?: ReactNode
  status?: string | null
  tone?: BadgeTone
  dot?: boolean
  className?: string
}

export function Badge({
  children,
  status,
  tone,
  dot = false,
  className,
}: BadgeProps) {
  const finalTone = tone || statusTone(status)

  return (
    <span className={cx('uiBadge', `uiBadge-${finalTone}`, className)}>
      {dot && <i aria-hidden="true" />}
      {children || prettyStatus(status)}
    </span>
  )
}

type EmptyStateProps = {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  secondaryAction?: ReactNode
  className?: string
}

export function EmptyState({
  icon = '◎',
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cx('uiEmptyState', className)}>
      <div className="uiEmptyIcon">{icon}</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}

      {(action || secondaryAction) && (
        <div className="uiEmptyActions">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}

type PageHeaderProps = {
  eyebrow?: string
  title: string
  description?: ReactNode
  actions?: ReactNode
  meta?: ReactNode
  className?: string
  compact?: boolean
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
  compact = false,
}: PageHeaderProps) {
  return (
    <section className={cx('uiPageHeader', compact && 'uiPageHeaderCompact', className)}>
      <div>
        {eyebrow && <p className="uiEyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
        {meta && <div className="uiPageMeta">{meta}</div>}
      </div>

      {actions && <div className="uiPageActions">{actions}</div>}
    </section>
  )
}

type StatCardProps = {
  label: string
  value: ReactNode
  description?: ReactNode
  icon?: ReactNode
  tone?: BadgeTone
  trend?: ReactNode
  className?: string
}

export function StatCard({
  label,
  value,
  description,
  icon,
  tone = 'neutral',
  trend,
  className,
}: StatCardProps) {
  return (
    <div className={cx('uiStatCard', `uiStatCard-${tone}`, className)}>
      <div className="uiStatTop">
        <span>{label}</span>
        {icon && <em>{icon}</em>}
      </div>

      <strong>{value}</strong>

      {(description || trend) && (
        <div className="uiStatBottom">
          {description && <small>{description}</small>}
          {trend && <b>{trend}</b>}
        </div>
      )}
    </div>
  )
}

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.body.classList.add('uiModalOpen')
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('uiModalOpen')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="uiModalOverlay" role="presentation" onMouseDown={onClose}>
      <section
        className={cx('uiModal', `uiModal-${size}`)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="uiModalHeader">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>

          <button className="uiModalClose" type="button" onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </header>

        <div className="uiModalBody">{children}</div>

        {footer && <footer className="uiModalFooter">{footer}</footer>}
      </section>
    </div>
  )
}

type TabItem = {
  id: string
  label: string
  badge?: ReactNode
  content: ReactNode
}

type TabsProps = {
  items: TabItem[]
  activeId?: string
  onChange?: (id: string) => void
  variant?: 'pill' | 'underline'
  className?: string
}

export function Tabs({
  items,
  activeId,
  onChange,
  variant = 'pill',
  className,
}: TabsProps) {
  const [internalActiveId, setInternalActiveId] = useState(items[0]?.id || '')

  const selectedId = activeId || internalActiveId

  const activeItem = useMemo(() => {
    return items.find(item => item.id === selectedId) || items[0]
  }, [items, selectedId])

  function select(id: string) {
    setInternalActiveId(id)
    onChange?.(id)
  }

  return (
    <div className={cx('uiTabs', `uiTabs-${variant}`, className)}>
      <div className="uiTabList" role="tablist">
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={activeItem?.id === item.id}
            className={activeItem?.id === item.id ? 'active' : ''}
            onClick={() => select(item.id)}
          >
            <span>{item.label}</span>
            {item.badge && <b>{item.badge}</b>}
          </button>
        ))}
      </div>

      <div className="uiTabPanel" role="tabpanel">
        {activeItem?.content}
      </div>
    </div>
  )
}

type SkeletonProps = {
  variant?: 'text' | 'card' | 'stat' | 'table' | 'avatar' | 'page'
  rows?: number
  className?: string
}

export function Skeleton({
  variant = 'text',
  rows = 3,
  className,
}: SkeletonProps) {
  if (variant === 'page') {
    return (
      <div className={cx('uiSkeletonPage', className)}>
        <div className="uiSkeletonHero" />
        <div className="uiSkeletonGrid">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      </div>
    )
  }

  if (variant === 'stat') {
    return <div className={cx('uiSkeleton', 'uiSkeletonStat', className)} />
  }

  if (variant === 'avatar') {
    return <div className={cx('uiSkeleton', 'uiSkeletonAvatar', className)} />
  }

  if (variant === 'table') {
    return (
      <div className={cx('uiSkeletonTable', className)}>
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} />
        ))}
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div className={cx('uiSkeletonCard', className)}>
        <div />
        <div />
        <div />
      </div>
    )
  }

  return (
    <div className={cx('uiSkeletonText', className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  )
}

type ActionBannerProps = {
  title: string
  description?: ReactNode
  tone?: BadgeTone
  icon?: ReactNode
  action?: ReactNode
  onDismiss?: () => void
  className?: string
}

export function ActionBanner({
  title,
  description,
  tone = 'info',
  icon = '◎',
  action,
  onDismiss,
  className,
}: ActionBannerProps) {
  return (
    <section className={cx('uiActionBanner', `uiActionBanner-${tone}`, className)}>
      <div className="uiActionIcon">{icon}</div>

      <div className="uiActionContent">
        <strong>{title}</strong>
        {description && <p>{description}</p>}
      </div>

      {action && <div className="uiActionButton">{action}</div>}

      {onDismiss && (
        <button className="uiActionDismiss" type="button" onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      )}
    </section>
  )
}