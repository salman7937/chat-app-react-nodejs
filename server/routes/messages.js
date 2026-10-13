const {
  addMessage,
  getMessages,
  getUnreadCounts,
  reactMessage,
} = require("../controllers/messageController");
const router = require("express").Router();

router.post("/addmsg/", addMessage);
router.post("/getmsg/", getMessages);
router.get("/unread-counts/:userId", getUnreadCounts);
router.post("/react-message", reactMessage);

module.exports = router;
