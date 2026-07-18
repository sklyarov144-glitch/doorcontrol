import React from "react";
import { AuthProvider } from "../contexts/AuthContext";
import { Header, Sidebar } from "./AppShell";

export default function AuthenticatedAppShell({
  authValue,
  sidebarCollapsed,
  role,
  activeScreen,
  onNavigate,
  onLogout,
  taskNoticeCount,
  onToggleSidebar,
  screen,
  selectedObject,
  selectedBuilding,
  selectedFloor,
  selectedDoor,
  user,
  users,
  notifications,
  unreadNotifications,
  allowUserSwitch,
  onOpenNotification,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onOpenNotificationsPage,
  onUserChange,
  children,
}) {
  return (
    <AuthProvider value={authValue}>
      <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <Sidebar
          role={role}
          activeScreen={activeScreen}
          setScreen={onNavigate}
          onLogout={onLogout}
          taskNoticeCount={taskNoticeCount}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={onToggleSidebar}
        />
        <main className="content">
          <Header
            screen={screen}
            setScreen={onNavigate}
            selectedObject={selectedObject}
            selectedBuilding={selectedBuilding}
            selectedFloor={selectedFloor}
            selectedDoor={selectedDoor}
            user={user}
            users={users}
            notifications={notifications}
            unreadNotifications={unreadNotifications}
            allowUserSwitch={allowUserSwitch}
            onOpenNotification={onOpenNotification}
            onMarkNotificationRead={onMarkNotificationRead}
            onMarkAllNotificationsRead={onMarkAllNotificationsRead}
            onOpenNotificationsPage={onOpenNotificationsPage}
            onUserChange={onUserChange}
          />
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
