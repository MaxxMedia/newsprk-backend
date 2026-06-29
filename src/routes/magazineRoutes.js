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

    import { requireAuth, requireAdmin } from "../middleware/auth.js";

    const router = express.Router();

    /* ================= MAGAZINE ================= */

router.post("/", requireAuth, requireAdmin, createMagazine);
router.put("/:id", requireAuth, requireAdmin, updateMagazine);
router.delete("/:id", requireAuth, requireAdmin, deleteMagazine);

router.get("/admin", requireAuth, requireAdmin, getAllMagazinesAdmin);
router.get("/creation-data", requireAuth, requireAdmin, getMagazineCreationData);

/* ================= AUTHORS ================= */

router.post("/authors", requireAuth, requireAdmin, createMagazineAuthor);
router.get("/authors", getAllMagazineAuthors);

/* ================= COVER STORIES ================= */

router.post("/cover-stories", requireAuth, requireAdmin, createCoverStory);
router.get("/cover-stories", getAllCoverStories);
router.get("/cover-stories/:slug", getSingleCoverStory);

/* ================= REGISTRATIONS ================= */

router.get("/:id/registrations", requireAuth, requireAdmin, getMagazineRegistrations);
router.post("/:magazineId/register", registerMagazine);

/* ================= PUBLIC ================= */

router.get("/", getAllMagazines);

/* KEEP THIS LAST */
router.get("/:slug", getSingleMagazine);

    export default router;
