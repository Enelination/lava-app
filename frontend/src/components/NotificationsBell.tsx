import { useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { notifications as notificationsApi } from '../lib/api'
import { useAuth } from '../store/authStore'
import type { AppNotification } from '../types'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function NotificationsBell() {
  const { user } = useAuth()
  const [items, setItems] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const announcedRef = useRef(false)

  const load = async () => {
    try {
      const data = await notificationsApi.list()
      setItems(data.notifications)
      setUnread(data.unread)
      if (!announcedRef.current && data.unread > 0) {
        announcedRef.current = true
        toast(data.unread === 1 ? 'You have 1 new notification.' : `You have ${data.unread} new notifications.`)
      }
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!user) {
      setItems([])
      setUnread(0)
      announcedRef.current = false
      return
    }
    announcedRef.current = false
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [user])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const markAllRead = async () => {
    setLoading(true)
    try {
      await notificationsApi.markAllRead()
      setItems((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnread(0)
    } catch (err: any) {
      toast.error(err.message || 'Could not update notifications.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        className="relative bg-transparent border-none text-muted hover:text-ink cursor-pointer transition-colors p-1.5"
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="notifBadge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="notifPanel">
          <div className="notifHead">
            <b>Notifications</b>
            {unread > 0 && (
              <button onClick={markAllRead} disabled={loading} className="notifMarkAll">
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>
          <div className="notifList">
            {items.length === 0 && (
              <div className="notifEmpty">No notifications yet.</div>
            )}
            {items.map((n) => (
              <div key={n.id} className={`notifItem ${n.read ? 'read' : ''}`}>
                <span className="notifDot" />
                <div className="notifText">
                  <div className="notifMsg">{n.message}</div>
                  <div className="notifTime">{timeAgo(n.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
