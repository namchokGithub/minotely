/** "v1.0.0 · a1b2c3d": package.json version and the deployed commit, or "dev" locally (D54). */
export const APP_VERSION = `v${__APP_VERSION__} · ${__APP_COMMIT__}`;

/** When this build was made, in the viewer's local time. */
export const APP_BUILT_AT = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
}).format(new Date(__APP_BUILT_AT__));

export const APP_VERSION_TITLE = `Minotely ${APP_VERSION}, built ${APP_BUILT_AT}`;
