const express = require("express");
const router = express.Router();

const guardController = require("../controllers/guard.controller");
const guardAuth = require("../middlewares/guardAuth");
const guard2Auth =
  require("../middlewares/guard2Auth");
const guard3Auth =
  require("../middlewares/guard3Auth");
router.post("/login", guardController.guardLogin);

router.post("/visit", guard2Auth, guardController.markVisited);

router.post("/undo-visit", guard2Auth, guardController.undoVisited);
router.get("/tokens-per-hour", guardAuth, guardController.getTokensPerHourToday);
router.get("/tokens-per-hour2", guard2Auth, guardController.getTokensPerHourToday2);

router.post(
  "/physical-reference-entry",
  guard3Auth,
  guardController.addPhysicalReferenceEntry
);

router.get(
  "/physical-reference-entry",
  guard3Auth,
  guardController.getTodayPhysicalReferenceEntries
);

router.get(
  "/physical-reference-entry-guard2",
  guard2Auth,
  guardController.getTodayPhysicalReferenceEntries
);
router.get(
  "/entry-tokens",
  guardAuth,
  guardController.getEntryTokens
);

router.get(
  "/service-tokens",
  guard2Auth,
  guardController.getServiceTokens
);

router.post(
  "/entry",
  guardAuth,
  guardController.markEntry
);

router.post(
  "/undo-entry",
  guardAuth,
  guardController.undoEntry
);
module.exports = router;
