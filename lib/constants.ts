// lib/constants.ts

/** Risk score thresholds used for alert severity classification */
export const RISK_SCORE_HIGH = 70;
export const RISK_SCORE_MEDIUM = 40;

/** Number of days without activity before an app-user grant is considered stale */
export const STALE_ACCESS_DAYS = 30;

/** Number of days without activity before a grant shows an "inactive" flag */
export const INACTIVE_ACCESS_DAYS = 90;

/** Maximum CSV upload size for spend import (10 MB) */
export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

/** Invite expiry in days */
export const INVITE_EXPIRY_DAYS = 7;
