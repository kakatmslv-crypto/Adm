export const isOverdue = (dueDate: string): boolean => {
  const today = new Date().toISOString().split('T')[0];
  return dueDate < today;
};
