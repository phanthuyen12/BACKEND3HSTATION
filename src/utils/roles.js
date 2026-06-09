const normalizeRole = (role) => {
  if (role === 'user') return 'student';
  return role || 'student';
};

const isPrivilegedRole = (role) => ['admin', 'super_admin'].includes(role);

module.exports = {
  normalizeRole,
  isPrivilegedRole
};
