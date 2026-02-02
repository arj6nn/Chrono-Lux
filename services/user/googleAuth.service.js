/**
 * Prepare session user data after Google authentication
 * @param {Object} user
 */
export const prepareGoogleSessionUser = (user) => {
  if (!user || !user._id) return null;

  return {
    id: user._id.toString()
  };
};
