import express from "express";
import {
    getSinglePolicyholder,
    getTopPolicyholder
} from "./policyholdersRoute.controllers.js";

const router = express.Router();

router.route("/").get(getSinglePolicyholder)
router.route("/:code/top").get(getTopPolicyholder)
// router.route("/:code").get(getSingleNote).patch(updateNote).delete(deleteNote);

export default router;
