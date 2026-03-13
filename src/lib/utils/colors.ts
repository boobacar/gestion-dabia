export const getPatientColor = (patientId: string | undefined, id: string) => {
  let hash = 0;
  const str = patientId || id;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "#5c67f2", // Indigo
    "#0ea5e9", // Sky
    "#f43f5e", // Rose
    "#8b5cf6", // Violet
    "#f59e0b", // Amber
    "#10b981", // Emerald
    "#3b82f6", // Blue
    "#ec4899", // Pink
  ];
  return colors[Math.abs(hash) % colors.length];
};
