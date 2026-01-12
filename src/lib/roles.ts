export interface Role {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  priority: number; // Lower = more important, assigned first
}

export const ROLES: Role[] = [
  {
    id: 'wolf',
    name: 'หมาป่า',
    icon: 'wolf',
    description: 'ล่าเหยื่อในยามราตรี ซ่อนตัวในหมู่ชาวบ้าน',
    color: 'from-red-600 to-red-900',
    priority: 1,
  },
  {
    id: 'seer',
    name: 'เทพพยากรณ์',
    icon: 'eye',
    description: 'สามารถเปิดเผยตัวตนที่แท้จริงของผู้เล่นคนหนึ่งในแต่ละคืน',
    color: 'from-purple-500 to-purple-800',
    priority: 2,
  },
  {
    id: 'bodyguard',
    name: 'บอดี้การ์ด',
    icon: 'shield',
    description: 'ปกป้องผู้เล่นคนหนึ่งจากการโจมตีในยามราตรี',
    color: 'from-blue-500 to-blue-800',
    priority: 3,
  },
  {
    id: 'beggar',
    name: 'ยาจก',
    icon: 'user',
    description: 'ไร้พลังพิเศษ แต่ชีวิตมีค่าสำหรับทีม',
    color: 'from-amber-600 to-amber-900',
    priority: 4,
  },
  {
    id: 'mute',
    name: 'ใบ้',
    icon: 'volume-x',
    description: 'ไม่สามารถพูดในรอบกลางวัน แต่ยังลงคะแนนได้',
    color: 'from-gray-500 to-gray-800',
    priority: 5,
  },
  {
    id: 'gm',
    name: 'ผู้ดำเนินเกม',
    icon: 'crown',
    description: 'ควบคุมจังหวะเกม รู้ตัวตนของทุกคน',
    color: 'from-yellow-500 to-yellow-800',
    priority: 6,
  },
];

export const assignRoles = (playerCount: number): string[] => {
  // Sort roles by priority
  const sortedRoles = [...ROLES].sort((a, b) => a.priority - b.priority);
  
  // Assign roles based on player count
  const assignedRoles: string[] = [];
  
  for (let i = 0; i < playerCount && i < sortedRoles.length; i++) {
    assignedRoles.push(sortedRoles[i].id);
  }
  
  // Shuffle the assigned roles
  for (let i = assignedRoles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [assignedRoles[i], assignedRoles[j]] = [assignedRoles[j], assignedRoles[i]];
  }
  
  return assignedRoles;
};

export const getRoleById = (id: string): Role | undefined => {
  return ROLES.find(role => role.id === id);
};
