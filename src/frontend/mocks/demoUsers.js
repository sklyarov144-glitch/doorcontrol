export const demoPassword = "123456";

export const mockUsers = [
  { id: "creator-1", name: "Демо: создатель", role: "creator", position: "Создатель системы", email: "creator@example.test", phone: "", avatarUrl: "", status: "active", assignedObjectIds: [], assignedBuildingIds: [], password: demoPassword },
  { id: "head-1", name: "Демо: руководитель", role: "company_head", position: "Руководитель компании", email: "head@example.test", phone: "", avatarUrl: "", status: "active", assignedObjectIds: [], assignedBuildingIds: [], password: demoPassword },
  { id: "director-1", name: "Демо: директор", role: "construction_director", position: "Директор по строительству", email: "director@example.test", phone: "", avatarUrl: "", status: "active", assignedObjectIds: ["matveevsky-park", "prokshino", "salaryevo-park"], assignedBuildingIds: [], password: demoPassword },
  { id: "itr-1", name: "Демо: ИТР", role: "itr", position: "Инженер ИТР", email: "itr@example.test", phone: "", avatarUrl: "", status: "active", assignedObjectIds: ["matveevsky-park"], assignedBuildingIds: ["matveevsky-park-building-4-1", "matveevsky-park-building-4-2"], password: demoPassword },
];
