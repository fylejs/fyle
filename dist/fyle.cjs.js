/**
 * @license
 * fyle 0.0.1 https://github.com/fylejs/fyle/blob/master/LICENSE
 */

'use strict';

/**
 * Splits up a path into its segments
 * @param  {string} filePath A file path
 *
 * @return {array}           Path segments
 */
var getPathSegments = function(filePath) {
  return filePath.split("/");
};

/**
 * Resolves relative paths to absolute
 * @param  {array} pathSegments Path segments of the path to resolve
 *
 * @return {array}              Absolute path segments
 */
var getAbsolutePathSegments = function(pathSegments) {
  return pathSegments.reduce(function(carry, segment, idx) {
    if (segment != ".." && pathSegments[idx + 1] != "..") {
      carry.push(segment);
    }

    return carry;
  }, []);
};

/**
 * Collects several information of the path
 * @param  {string} filePath Relative filePath as string
 *
 * @return {object}          Information about the path
 */
var getFilePathInfo = function(filePath) {
  var removeSuffix = /(.*?)(?:\..*)?$/;
  var relativeFilePathSegments = getPathSegments(filePath);
  var filePathSegments = getAbsolutePathSegments(relativeFilePathSegments);

  var fileNameIdx = filePathSegments.length - 1;
  filePathSegments[fileNameIdx] = filePathSegments[fileNameIdx].match(
    removeSuffix
  )[1];
  var fileName = filePathSegments[fileNameIdx];

  var pathSegments = filePathSegments.slice(0, -1);
  var absoluteFilePath = filePathSegments.join("/");
  var path = pathSegments.length > 0 ? pathSegments.join("/") + "/" : "";

  return {
    filePath: absoluteFilePath,
    fileName: fileName,
    pathArr: pathSegments,
    path: path
  };
};

/**
 * Holds references to all added files
 */
var files = {};
var filesByDependency = {};
var lastWatchedFiles = [];
var scheduledFiles = [];

/**
 * Creates a new require function
 *
 * @param {string} innerFilePath - (optional), this path will be used as prefix for all paths of the required calls
 *
 * @return {Function} the new require function
 */
var createRequire = function(innerFilePath) {
  return function(filePath, shareNames) {
    var filePathInfo = getFilePathInfo(innerFilePath + filePath);
    if (!files[filePathInfo.filePath]) {
      lastWatchedFiles[lastWatchedFiles.length - 1].requiredFiles.push(
        filePathInfo.filePath
      );
      return window;
    }

    if (!shareNames || shareNames.length === 0) {
      return files[filePathInfo.filePath];
    } else {
      var result = Object.create(null);

      shareNames.forEach(function(shareName) {
        result[shareName] = files[filePathInfo.filePath][shareName];
      });

      return result;
    }
  };
};

var wait = function() {
  var result = false;
  var lastWatchedFile = lastWatchedFiles[lastWatchedFiles.length - 1];

  // When lastWatchedFile isnt defined this means, that wait is called from a function its dependencies are fulfilled
  if (lastWatchedFile && lastWatchedFile.requiredFiles.length > 0) {
    lastWatchedFile.waiting = true;
    var fileId = scheduledFiles.push(lastWatchedFile) - 1;
    for (var i = 0; i < lastWatchedFile.requiredFiles.length; i++) {
      var dependencyName = lastWatchedFile.requiredFiles[i];
      if (!filesByDependency[dependencyName])
        { filesByDependency[dependencyName] = []; }
      filesByDependency[dependencyName].push(fileId);
    }
    result = true;
  }

  return result;
};

var includeScheduledFiles = function(scheduledFiles, lastFilePath) {
  if (filesByDependency[lastFilePath]) {
    filesByDependency[lastFilePath].forEach(function(fileName) {
      var file = scheduledFiles[fileName];
      if (file !== null) {
        var ready = true;
        for (var i = 0; i < file.requiredFiles.length; i++) {
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

var createFyle = function(innerFilePath) {
  innerFilePath = innerFilePath ? innerFilePath : "";
  var fyle = function(filePath, fileFunction) {
    var filePathInfo = getFilePathInfo(innerFilePath + filePath);
    if (files[filePathInfo.filePath] == null) {
      files[filePathInfo.filePath] = Object.create(null);
    } else {
      return false;
    }

    var lastFileCall = function() {
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
    var waiting = lastWatchedFiles[lastWatchedFiles.length - 1].waiting;
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

var fyle$1 = createFyle();

module.exports = fyle$1;
