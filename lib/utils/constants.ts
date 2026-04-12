export const APP_NAME = "SPAY"
export const DASHBOARD_SIDEBAR_TITLE = "Control Center"
export const ORG_LABEL = "ORGANIZATION"
export const DEV_TEST_USER_ID = process.env.NODE_ENV === "development"
	? process.env.DEV_TEST_USER_ID ?? null
	: null
export const TEMP_LOCAL_TEST_EMAIL = "test@spay.local"
