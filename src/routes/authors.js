import express from "express";
import { getAuthors, createAuthor, updateAuthor, deleteAuthor } from "../controllers/authorsController.js";

const router = express.Router();

router.get("/", getAuthors);
router.post("/", createAuthor);
router.put("/:id", updateAuthor);
router.delete("/:id", deleteAuthor);

export default router;
