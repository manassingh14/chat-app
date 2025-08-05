import express from "express"
import { login, logout, signup } from "../controller/auth_controlle.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { updateProfile } from "../controller/auth_controlle.js";
import { checkAuth } from "../controller/auth_controlle.js";
const router =express.Router();
router.post("/signup",signup);

router.post("/login",login);

router.post("/logout",logout);
router.put("/update-profile", protectRoute, updateProfile);
router.get("/check",protectRoute,checkAuth)
export default router;