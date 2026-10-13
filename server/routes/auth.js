const {
  login,
  register,
  getAllUsers,
  setAvatar,
  logOut,
  searchUsers,
  addContact,
  blockUser,
  unblockUser,
} = require("../controllers/userController");

const router = require("express").Router();

router.post("/login", login);
router.post("/register", register);
router.get("/allusers/:id", getAllUsers);
router.post("/setavatar/:id", setAvatar);
router.get("/search", searchUsers);
router.post("/contacts/add", addContact);
router.post("/block", blockUser);
router.post("/unblock", unblockUser);
router.get("/logout/:id", logOut);

module.exports = router;
