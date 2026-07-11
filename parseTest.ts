const includedRoles = ['1 Photographer', '2 Cinematographers', 'Drone Operator'];
const totalRequiredCount = includedRoles.reduce((sum, roleStr) => {
  const match = roleStr.match(/^(\d+)\s+(.+)$/);
  return sum + (match ? parseInt(match[1], 10) : 1);
}, 0);
console.log(totalRequiredCount);
