const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const monitorController = require("../controllers/monitor.controller");
const monitorAuth = require("../middlewares/monitorAuth");

// Auth routes (no middleware)
router.post("/login", authController.login);
router.post("/logout", authController.logout);

// Protected routes
router.get("/verify-session", monitorAuth, authController.verifySession);
router.get("/kpi/summary", monitorAuth, monitorController.getKPISummary);
router.get("/tokens/by-service", monitorAuth, monitorController.getServiceBreakdown);
router.get("/tokens/by-district", monitorAuth, monitorController.getDistrictBreakdown);
router.get("/tokens/by-hour", monitorAuth, monitorController.getHourlyDistribution);
router.get("/tokens/by-mode", monitorAuth, monitorController.getModeBreakdown);
router.get("/tokens/by-age-gender", monitorAuth, monitorController.getAgeGenderBreakdown);
router.get("/tokens/trend", monitorAuth, monitorController.getDailyTrend);
router.get("/tokens/visit-analysis", monitorAuth, monitorController.getVisitAnalysis);
router.get("/geo/heatmap", monitorAuth, monitorController.getGeoHeatmap);
router.get("/slots/status", monitorAuth, monitorController.getSlotStatus);
router.get("/region-compare", monitorAuth, monitorController.getRegionCompare);
router.get(
    "/tokens/by-service-raw",
    monitorController.getServiceBreakdownRaw
);
router.get(
    "/bulk-export",
    monitorAuth,
    monitorController.exportBulkCSV
);

module.exports = router;
