"use client";

import { useMemo, useState } from "react";
import { Bell, CheckCircle2, Crown, UserPlus, X } from "lucide-react";
import type { AdminNotification } from "@/lib/admin/notifications";

const ADMIN_SEEN_NOTIFICATIONS_KEY = "escoply-admin-seen-notifications";

function readSeenNotifications() {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const rawValue = window.localStorage.getItem(ADMIN_SEEN_NOTIFICATIONS_KEY);
    const parsedValue = rawValue ? JSON.parse(rawValue) : [];
    return new Set(Array.isArray(parsedValue) ? parsedValue.filter((item): item is string => typeof item === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function saveSeenNotifications(ids: Set<string>) {
  window.localStorage.setItem(ADMIN_SEEN_NOTIFICATIONS_KEY, JSON.stringify([...ids].slice(-100)));
}

export function AdminHeaderActions({ notifications }: { notifications: AdminNotification[] }) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [seenNotificationIds, setSeenNotificationIds] = useState<Set<string>>(() => readSeenNotifications());
  const unreadNotifications = useMemo(() => notifications.filter((notification) => !seenNotificationIds.has(notification.id)), [notifications, seenNotificationIds]);

  const openNotifications = () => {
    setIsNotificationsOpen((current) => {
      const nextValue = !current;

      if (nextValue) {
        setSeenNotificationIds((currentSeenIds) => {
          const nextSeenIds = new Set(currentSeenIds);
          notifications.forEach((notification) => nextSeenIds.add(notification.id));
          saveSeenNotifications(nextSeenIds);
          return nextSeenIds;
        });
      }

      return nextValue;
    });
  };

  return (
    <div className="admin-header-actions">
      {isNotificationsOpen && <button type="button" className="admin-header-dismiss" aria-label="Fechar notificações" onClick={() => setIsNotificationsOpen(false)} />}
      <span className="admin-online-badge">
        <CheckCircle2 size={15} />
        Plataforma online
      </span>
      <div className="admin-header-action-wrap">
        <button type="button" aria-label="Notificações admin" aria-expanded={isNotificationsOpen} onClick={openNotifications}>
          <Bell size={22} />
          {unreadNotifications.length > 0 && <span>{unreadNotifications.length}</span>}
        </button>
        {isNotificationsOpen && (
          <section className="admin-header-popover" aria-label="Notificações admin">
            <header><strong>Notificações admin</strong><button type="button" onClick={() => setIsNotificationsOpen(false)} aria-label="Fechar notificações"><X size={16} /></button></header>
            {notifications.length === 0 ? <p className="admin-empty-state">Nenhuma notificação recente.</p> : null}
            {notifications.map((notification) => {
              const Icon = notification.kind === "pro_plan" ? Crown : UserPlus;
              const isSeen = seenNotificationIds.has(notification.id);

              return (
              <article key={notification.id} className={isSeen ? "is-seen" : undefined}>
                <Icon size={16} />
                <div><strong>{notification.title}</strong><p>{notification.detail}</p><small>{isSeen ? "Vista" : notification.createdAt}</small></div>
              </article>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}
