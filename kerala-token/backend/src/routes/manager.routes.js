const express = require("express");
const router = express.Router();

const managerController = require("../controllers/manager.controller");
const managerAuth = require("../middlewares/managerAuth");
const geojsonUpload =
require("../middlewares/geojsonUpload");

const qrUpload =
require("../middlewares/qrUpload");
const qrController =
require("../controllers/qr.controller");
router.post("/login", managerController.managerLogin);
router.post(
  "/reset-password",
  managerController.resetPassword
);
router.get("/calendar", managerAuth, managerController.getCalendarOverview);
router.get("/tokens", managerAuth, managerController.getTokensByDate);
router.get("/dashboard", managerAuth, managerController.getDateDashboard);
router.get(
  "/physical-reference-entry",
  managerAuth,
  managerController.getTodayPhysicalReferenceEntries
);

router.post(

"/upload-qr/:type",

qrUpload.single("qr"),

qrController.uploadQR

);
router.get(
    "/dashboard-field-settings/:dashboard",
    managerController.getDashboardFieldSettings
);

router.post(
    "/dashboard-field-settings",
    managerController.updateDashboardFieldSettings
);

router.get(
"/form-field-settings",
managerController.getFormSettings
);

router.post("/form-field-settings/:fieldKey",
managerAuth,
managerController.updateFormSetting
);

router.post(

"/delete-qr/:type",

qrController.deleteQR

);
router.get(
"/weekday-slots",
managerAuth,
managerController.getWeekdaySlots
);

router.post(
"/upload-geojson",
managerAuth,
geojsonUpload.single("geojson"),
managerController.uploadGeojson
);
router.get(
"/geojson",
managerController.getGeojson
);

router.post("/weekday-slots",
managerAuth,
managerController.updateWeekdaySlots
);

router.get(
"/weekday-rules",
managerAuth,
managerController.getWeekdayRules
);

router.put(
"/weekday-rules",
managerAuth,
managerController.updateWeekdayRule
);
router.get(
"/district-master",
managerController.getDistricts
);
router.post(
"/service-form-settings",
managerController.updateServiceFormSettings
);
router.post(
"/add-district-master",
managerAuth,
managerController.addDistrict
);

router.post(
"/delete-district-master/:id",
managerAuth,
managerController.deleteDistrict
);
router.get(
    "/users",
    managerAuth,
    managerController.getUsers
);
router.post("/users/:id",
    managerAuth,
    managerController.updateUser
);

router.get(
    "/working-days",
    managerAuth,
    managerController.getWorkingDays
);

router.post(
    "/add-working-day",
    managerAuth,
    managerController.addWorkingDay
);

router.post(
    "/delete-working-day",
    managerAuth,
    managerController.deleteWorkingDay
);
router.post(
"/add-service-type",
managerAuth,
managerController.addServiceType
);

router.post(
"/delete-service-type/:id",
managerAuth,
managerController.deleteServiceType
);
router.post("/update-slots", managerAuth, managerController.updateSlots);
router.post("/set-tokens-per-hour", managerAuth, managerController.updateTokensPerHour);

router.post("/update-priority-rules", managerController.updatePriorityRules);

router.post("/add-priority-district", managerController.addPriorityDistrict);

router.post("/delete-priority-district", managerController.deletePriorityDistrict);

router.post("/add-holiday", managerController.addHoliday);
router.post("/delete-holiday", managerController.deleteHoliday);
router.get("/holidays", managerController.getHolidays);
router.post("/save-notice", managerController.saveNotice);
router.get("/notices", managerController.getAllNotices);
router.post("/delete-notice", managerController.deleteNotice);
router.get(
  "/export-range-csv",
  managerAuth,
  managerController.exportRangeCSV
);
router.get(
    "/service-types",
    managerController.getServiceTypes
);
module.exports = router;





