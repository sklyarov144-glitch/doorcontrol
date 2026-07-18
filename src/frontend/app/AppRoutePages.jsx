import React from "react";
import FinancePage from "../pages/FinancePage";
import DocumentsPage from "../pages/DocumentsPage";
import RemoteDocumentsPage from "../pages/RemoteDocumentsPage";
import RemoteExecutiveDashboard from "../pages/RemoteExecutiveDashboard";
import CompanyDashboard from "../pages/DashboardPage";
import RemoteTnIssuesPage from "../pages/RemoteTnIssuesPage";
import RemoteProblemCenterPage from "../pages/RemoteProblemCenterPage";
import RemoteCustodyActsPage from "../pages/RemoteCustodyActsPage";
import { RemoteBrigadePlanPage, RemoteManpowerPage } from "../pages/RemoteWorkforcePage";
import AuditLogPage from "../pages/AuditLogPage";
import UsersPage from "../pages/UsersPage";
import RolesPage from "../pages/RolesPage";
import CompanyPage from "../pages/CompanyPage";
import ObjectsPage from "../pages/ObjectsPage";
import StandaloneObjectPage from "../pages/ObjectPage";
import StandaloneManpowerPage from "../pages/ManpowerPage";
import StandaloneBrigadePlanPage from "../pages/BrigadePlanPage";
import StandaloneCustodyActsPage from "../pages/CustodyActsPage";
import StandaloneProblemCenterPage from "../pages/ProblemCenterPage";
import StandaloneTnIssuesPage from "../pages/TnIssuesPage";
import ManualTasksPage from "../pages/TasksPage";
import TodayTasksPage from "../pages/TodayTasksPage";
import ReportsPage from "../pages/ReportsPage";
import NotificationsPage from "../pages/NotificationsPage";
import BuildingVisualization from "../pages/BuildingPage";
import FloorPlan from "../pages/FloorPage";
import DoorDetails from "../pages/DoorPage";

function AccessDeniedPage() {
  return <section className="placeholder-page"><div className="placeholder-mark">Г</div><div><h2>Нет доступа</h2><p>Для вашей роли этот раздел недоступен.</p></div></section>;
}

export default function AppRoutePages({
  screen,
  objects,
  visibleObjects,
  user,
  users,
  remoteTeams,
  teams,
  manpowerObjects,
  demoPassword,
  notifications,
  manualTasks,
  selectedObject,
  selectedBuilding,
  selectedFloorId,
  selectedFloor,
  selectedDoor,
  canCreateManualTask,
  onReadNotification,
  onReadAllNotifications,
  onOpenNotificationProblem,
  onOpenTaskModal,
  onSetScreen,
  onSetActNotificationTask,
  onQuickAcceptTn,
  onChangeManualTask,
  onCommentManualTask,
  onLinkManualTask,
  onNotify,
  onUpdateCustodyAct,
  onUpdateDoor,
  onSaveUsers,
  onChangeObjects,
  onOpenObject,
  onOpenBuilding,
  onOpenFloor,
  onOpenDoor,
  onSaveDoor,
}) {
  // Keep the production bundle free of local/demo page modules. Vite replaces
  // this flag at build time, allowing Rollup to remove the unused provider branch.
  const buildUsesSupabase = import.meta.env.VITE_DATA_PROVIDER === "supabase";

  return <>
    {screen === "documents" && (buildUsesSupabase
      ? <RemoteDocumentsPage objects={visibleObjects} user={user} />
      : <DocumentsPage objects={visibleObjects} user={user} />)}
    {screen === "brigade_plan" && (buildUsesSupabase
      ? <RemoteBrigadePlanPage objects={visibleObjects} user={user} users={users} />
      : <StandaloneBrigadePlanPage objects={visibleObjects} user={user} users={users} />)}
    {screen === "manpower" && (buildUsesSupabase
      ? <RemoteManpowerPage objects={visibleObjects} user={user} users={users} onNotify={onNotify} />
      : <StandaloneManpowerPage objects={visibleObjects} user={user} users={users} onNotify={onNotify} />)}
    {screen === "notifications" && (
      <NotificationsPage
        notifications={notifications}
        onOpen={(notification) => {
          onReadNotification(notification.id);
          notification.taskId ? onSetScreen("tasks") : onOpenNotificationProblem(notification);
        }}
        onMarkRead={onReadNotification}
        onMarkAll={onReadAllNotifications}
        onQuickAct={(notification) => {
          const task = manualTasks.find((item) => item.id === notification.taskId);
          if (task) onSetActNotificationTask({ task, notificationId: notification.id });
        }}
        onQuickTn={onQuickAcceptTn}
      />
    )}
    {screen === "tasks" && (
      <ManualTasksPage
        tasks={manualTasks}
        objects={visibleObjects}
        user={user}
        users={users}
        onOpen={onOpenNotificationProblem}
        onCreateTask={() => onOpenTaskModal({})}
        onUpdateTask={onChangeManualTask}
        onAddComment={onCommentManualTask}
        onAddLink={onLinkManualTask}
      />
    )}
    {screen === "custody_acts" && (buildUsesSupabase
      ? <RemoteCustodyActsPage objects={visibleObjects} users={users} onOpen={onOpenNotificationProblem} onUpdateAct={onUpdateCustodyAct} />
      : <StandaloneCustodyActsPage objects={visibleObjects} user={user} users={users} onOpen={onOpenNotificationProblem} onUpdateAct={onUpdateCustodyAct} />)}
    {screen === "tn_issues" && (buildUsesSupabase
      ? <RemoteTnIssuesPage objects={visibleObjects} users={users} onOpen={onOpenNotificationProblem} onResolve={(doorId) => onUpdateDoor(doorId, { issue: "устранено", tnIssues: "Нет" })} />
      : <StandaloneTnIssuesPage objects={visibleObjects} user={user} users={users} onOpen={onOpenNotificationProblem} />)}
    {screen === "today_tasks" && <TodayTasksPage tasks={manualTasks} objects={visibleObjects} user={user} users={users} onOpen={onOpenNotificationProblem} onUpdateTask={onChangeManualTask} />}
    {screen === "problem_center" && (buildUsesSupabase
      ? <RemoteProblemCenterPage objects={visibleObjects} user={user} users={users} onOpen={onOpenNotificationProblem} onCreateTask={onOpenTaskModal} />
      : <StandaloneProblemCenterPage objects={visibleObjects} user={user} users={users} onOpen={onOpenNotificationProblem} onCreateTask={onOpenTaskModal} />)}
    {screen === "reports" && <ReportsPage objects={visibleObjects} />}
    {screen === "finance" && <FinancePage objects={visibleObjects} user={user} />}
    {screen === "audit" && ["creator", "company_head", "construction_director"].includes(user.role)
      && <AuditLogPage objects={visibleObjects} users={users} />}
    {screen === "audit" && !["creator", "company_head", "construction_director"].includes(user.role)
      && <AccessDeniedPage />}
    {screen === "company_dashboard" && (buildUsesSupabase
      ? <RemoteExecutiveDashboard objects={visibleObjects} users={users} onOpen={onOpenNotificationProblem} />
      : <CompanyDashboard objects={visibleObjects} users={users} onOpen={onOpenNotificationProblem} manpowerObjects={manpowerObjects} />)}
    {screen === "users" && (
      <UsersPage
        users={users}
        objects={objects}
        currentUser={user}
        remoteAuth={buildUsesSupabase}
        demoPassword={demoPassword}
        onSave={onSaveUsers}
      />
    )}
    {screen === "roles" && <RolesPage users={users} onOpenUsers={() => onSetScreen("users")} />}
    {screen === "companies" && <CompanyPage objects={visibleObjects} users={users} user={user} onOpenObjects={() => onSetScreen("objects")} />}
    {screen === "objects" && <ObjectsPage objects={visibleObjects} onOpen={onOpenObject} />}
    {screen === "object" && selectedObject && (
      <StandaloneObjectPage
        object={selectedObject}
        objects={objects}
        users={users}
        teams={buildUsesSupabase ? remoteTeams : teams}
        user={user}
        onOpenBuilding={onOpenBuilding}
        onCreateTask={onOpenTaskModal}
        canCreateTask={canCreateManualTask}
        onChange={onChangeObjects}
      />
    )}
    {screen === "building" && selectedBuilding && (
      <section className="building-dashboard">
        <BuildingVisualization
          building={selectedBuilding}
          objectId={selectedObject?.id}
          selectedFloorId={selectedFloorId}
          onSelectFloor={onOpenFloor}
          onCreateTask={onOpenTaskModal}
          canCreateTask={canCreateManualTask}
        />
      </section>
    )}
    {screen === "floor" && selectedBuilding && selectedFloor && (
      <FloorPlan
        object={selectedObject}
        building={selectedBuilding}
        floor={selectedFloor}
        onOpenDoor={onOpenDoor}
        onBack={() => onSetScreen("building")}
        onCreateTask={onOpenTaskModal}
        canCreateTask={canCreateManualTask}
      />
    )}
    {screen === "door" && selectedDoor && (
      <DoorDetails
        object={selectedObject}
        building={selectedBuilding}
        floor={selectedFloor}
        door={selectedDoor}
        user={user}
        onSave={onSaveDoor}
        onBack={() => onSetScreen("floor")}
        onCreateTask={onOpenTaskModal}
        canCreateTask={canCreateManualTask}
      />
    )}
  </>;
}
