export const host =
  process.env.REACT_APP_API_HOST ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "https://blissful-playfulness-production-4ec9.up.railway.app"
    : "http://localhost:5000");
export const loginRoute = `${host}/api/auth/login`;
export const registerRoute = `${host}/api/auth/register`;
export const logoutRoute = `${host}/api/auth/logout`;
export const allUsersRoute = `${host}/api/auth/allusers`;
export const sendMessageRoute = `${host}/api/messages/addmsg`;
export const recieveMessageRoute = `${host}/api/messages/getmsg`;
export const setAvatarRoute = `${host}/api/auth/setavatar`;
export const unreadCountsRoute = `${host}/api/messages/unread-counts`;
export const reactMessageRoute = `${host}/api/messages/react-message`;
