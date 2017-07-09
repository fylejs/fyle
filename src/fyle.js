import { getFilePathInfo } from "./path.js";

/**
 * Holds references to all added files
 */
let files = {};
let filesByDependency = {};
let lastWatchedFiles = [];
let scheduledFiles = [];

/**
 * Creates a new require function
 *
 * @param {string} innerFilePath - (optional), this path will be used as prefix for all paths of the required calls
 *
 * @return {Function} the new require function
 */
const createRequire = function(innerFilePath) {
  return function(filePath, shareNames) {
    const filePathInfo = getFilePathInfo(innerFilePath + filePath);
    if (!files[filePathInfo.filePath]) {
      lastWatchedFiles[lastWatchedFiles.length - 1].requiredFiles.push(
        filePathInfo.filePath
      );
      return window;
    }

    if (!shareNames || shareNames.length === 0) {
      return files[filePathInfo.filePath];
    } else {
      let result = Object.create(null);

      shareNames.forEach(function(shareName) {
        result[shareName] = files[filePathInfo.filePath][shareName];
      });

      return result;
    }
  };
};

const wait = function() {
  let result = false;
  let lastWatchedFile = lastWatchedFiles[lastWatchedFiles.length - 1];

  // When lastWatchedFile isnt defined this means, that wait is called from a function its dependencies are fulfilled
  if (lastWatchedFile && lastWatchedFile.requiredFiles.length > 0) {
    lastWatchedFile.waiting = true;
    const fileId = scheduledFiles.push(lastWatchedFile) - 1;
    for (let i = 0; i < lastWatchedFile.requiredFiles.length; i++) {
      let dependencyName = lastWatchedFile.requiredFiles[i];
      if (!filesByDependency[dependencyName])
        filesByDependency[dependencyName] = [];
      filesByDependency[dependencyName].push(fileId);
    }
    result = true;
  }

  return result;
};

const includeScheduledFiles = function(scheduledFiles, lastFilePath) {
  if (filesByDependency[lastFilePath]) {
    filesByDependency[lastFilePath].forEach(function(fileName) {
      const file = scheduledFiles[fileName];
      if (file !== null) {
        let ready = true;
        for (let i = 0; i < file.requiredFiles.length; i++) {
          if (!files[file.requiredFiles[i]]) {
            ready = false;
            break;
          }
        }

        if (ready) {
          file.fileFn();
          scheduledFiles[fileName] = null;
          scheduledFiles = includeScheduledFiles(scheduledFiles, file.filePath);
        }
      }
    });
  }

  return scheduledFiles;
};

const createFyle = function(innerFilePath) {
  innerFilePath = innerFilePath ? innerFilePath : "";
  const fyle = function(filePath, fileFunction) {
    const filePathInfo = getFilePathInfo(innerFilePath + filePath);
    if (files[filePathInfo.filePath] == null) {
      files[filePathInfo.filePath] = Object.create(null);
    } else {
      return false;
    }

    const lastFileCall = function() {
      files[filePathInfo.filePath].return = fileFunction.call(
        null,
        files[filePathInfo.filePath],
        createRequire(filePathInfo.path),
        createFyle(filePathInfo.path)
      );
    };

    lastWatchedFiles.push({
      fileFn: lastFileCall,
      filePath: filePathInfo.filePath,
      requiredFiles: [],
      waiting: false
    });
    lastFileCall();
    const waiting = lastWatchedFiles[lastWatchedFiles.length - 1].waiting;
    lastWatchedFiles = lastWatchedFiles.slice(0, -1);
    if (!waiting) {
      scheduledFiles = includeScheduledFiles(
        scheduledFiles,
        filePathInfo.filePath
      );
    }

    return files[filePathInfo.filePath];
  };

  fyle.require = createRequire(innerFilePath);
  fyle.wait = wait;

  return fyle;
};

const fyle = createFyle();

export default fyle;
