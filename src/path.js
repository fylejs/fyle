/**
 * Splits up a path into its segments
 * @param  {string} filePath A file path
 *
 * @return {array}           Path segments
 */
export const getPathSegments = function(filePath) {
  return filePath.split("/");
};

/**
 * Resolves relative paths to absolute
 * @param  {array} pathSegments Path segments of the path to resolve
 *
 * @return {array}              Absolute path segments
 */
export const getAbsolutePathSegments = function(pathSegments) {
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
export const getFilePathInfo = function(filePath) {
  const removeSuffix = /(.*?)(?:\..*)?$/;
  const relativeFilePathSegments = getPathSegments(filePath);
  let filePathSegments = getAbsolutePathSegments(relativeFilePathSegments);

  const fileNameIdx = filePathSegments.length - 1;
  filePathSegments[fileNameIdx] = filePathSegments[fileNameIdx].match(
    removeSuffix
  )[1];
  const fileName = filePathSegments[fileNameIdx];

  const pathSegments = filePathSegments.slice(0, -1);
  const absoluteFilePath = filePathSegments.join("/");
  const path = pathSegments.length > 0 ? pathSegments.join("/") + "/" : "";

  return {
    filePath: absoluteFilePath,
    fileName: fileName,
    pathArr: pathSegments,
    path
  };
};
