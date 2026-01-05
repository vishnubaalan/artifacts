export const getMapping = () => JSON.parse(localStorage.getItem('s3_key_mapping') || '{"keys": {}, "ids": {}}');
export const saveMapping = (map) => localStorage.setItem('s3_key_mapping', JSON.stringify(map));

export const encodeId = (key) => {
  if (!key) return '';
  const map = getMapping();
  if (map.keys[key]) return map.keys[key];
  
  // Generate a new numerical ID
  const nextId = Object.keys(map.ids).length + 1001; 
  map.keys[key] = nextId.toString();
  map.ids[nextId] = key;
  saveMapping(map);
  return nextId.toString();
};

export const decodeId = (id) => {
  if (!id) return '';
  const map = getMapping();
  return map.ids[id] || id; // Fallback to raw if not in map
};
