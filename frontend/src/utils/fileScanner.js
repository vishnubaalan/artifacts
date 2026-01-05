// Check if a file object is actually a folder placeholder
// Browsers often include the folder itself as a 0-byte or 4096-byte (Linux) file with no type
export const isFolderPlaceholder = (file) =>
  file.type === "" && (file.size === 0 || file.size === 4096);

// Recursive function to traverse FileSystemEntry
export const scanFiles = async (item, path = "") => {
  if (item.isFile) {
    return new Promise((resolve) => {
      item.file((file) => {
        // Force a property that our uploader recognizes
        Object.defineProperty(file, 'webkitRelativePath', {
          value: path + file.name,
          writable: true
        });
        resolve([file]);
      });
    });
  } else if (item.isDirectory) {
    const dirReader = item.createReader();
    const entries = await new Promise((resolve, reject) => {
      dirReader.readEntries(resolve, reject);
    });

    const filePromises = entries.map(entry => scanFiles(entry, path + item.name + "/"));
    const filesDeep = await Promise.all(filePromises);
    return filesDeep.flat();
  }
  return [];
};

export const getFilesFromEvent = async (e) => {
    // Use FileSystemEntry API for recursive directory scanning if available (Chrome/Edge/Firefox)
    const items = Array.from(e.dataTransfer.items || []);
    const entryPromises = items
      .map(item => item.webkitGetAsEntry ? item.webkitGetAsEntry() : null)
      .filter(entry => entry);

    if (entryPromises.length > 0) {
      const nestedFiles = await Promise.all(entryPromises.map(entry => scanFiles(entry)));
      const flatFiles = nestedFiles.flat();

      // Filter out any placeholders and system files
      const ignoredNames = [".metadata", ".DS_Store", ".git", "Thumbs.db", ".idea", ".vscode"];
      const validFiles = flatFiles.filter(f => 
        !isFolderPlaceholder(f) && 
        !ignoredNames.some(name => f.name === name || f.webkitRelativePath?.includes(`/${name}/`))
      );
      return validFiles;
    } else {
       // Fallback for browsers without Entry API
       return Array.from(e.dataTransfer.files).filter(f => !isFolderPlaceholder(f));
    }
};
