import { startCompanyTrial } from "../lib/companyTrials.js";

export async function activateTrial(req, res) {
  if (!["recruiter", "admin"].includes(req.user.role)) {
    return res.status(403).json({ error: "Only company accounts can start a trial." });
  }
  try {
    const { packageType, packageId } = req.body;
    const result = await startCompanyTrial(req.user.id, packageType, packageId);
    return res.json({ success: true, ...result });
  } catch (err) {
    if (!err.status) console.error("Start company trial error:", err);
    return res.status(err.status || 500).json({
      error: err.status ? err.message : "Could not start your free trial. Please try again.",
      code: err.code || "TRIAL_ACTIVATION_FAILED",
    });
  }
}
