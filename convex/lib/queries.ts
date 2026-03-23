export const takeWithLimit = async <T>(
  load: () => Promise<T[]>,
  limit: number,
  label: string,
): Promise<T[]> => {
  const results = await load();
  if (results.length > limit) {
    throw new Error(`${label} exceeded safe query limit of ${limit}`);
  }
  return results;
};
