    import express from "express";
    import {
      createMagazine,
      updateMagazine,
      deleteMagazine,
      getAllMagazines,
      getSingleMagazine,
      getMagazineRegistrations,
      registerMagazine,
      getMagazineCreationData,

      // NEW
      createMagazineAuthor,
      getAllMagazineAuthors,
      createCoverStory,
      getAllCoverStories,
      getSingleCoverStory,
      getAllMagazinesAdmin
    } from "../controllers/magazineController.js";

    import { requireAuth } from "../middleware/auth.js";
    import { requirePermission, requireModule } from "../middleware/permissions.js";

    const router = express.Router();

    /* ================= MAGAZINE ================= */

router.post("/", requireAuth, requirePermission("magazine.create"), createMagazine);
router.put("/:id", requireAuth, requirePermission("magazine.edit"), updateMagazine);
router.delete("/:id", requireAuth, requirePermission("magazine.delete"), deleteMagazine);

router.get("/admin", requireAuth, requireModule("magazine"), getAllMagazinesAdmin);
router.get("/creation-data", requireAuth, requireModule("magazine"), getMagazineCreationData);

/* ================= AUTHORS ================= */

router.post("/authors", requireAuth, requirePermission("magazine.create"), createMagazineAuthor);
router.get("/authors", getAllMagazineAuthors);

/* ================= COVER STORIES ================= */

router.post("/cover-stories", requireAuth, requirePermission("magazine.create"), createCoverStory);
router.get("/cover-stories", getAllCoverStories);
router.get("/cover-stories/:slug", getSingleCoverStory);

/* ================= REGISTRATIONS ================= */

router.get("/:id/registrations", requireAuth, requireModule("magazine"), getMagazineRegistrations);
router.post("/:magazineId/register", registerMagazine);

/* ================= PUBLIC ================= */

router.get("/", getAllMagazines);

/* KEEP THIS LAST */
router.get("/:slug", getSingleMagazine);

    export default router;
