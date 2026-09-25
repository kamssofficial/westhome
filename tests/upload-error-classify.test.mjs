/**
 * Tests for the Drive error classifier in src/lib/gdrive.ts.
 *
 * Why: the upload route used to collapse every Drive failure into a generic
 * "Upload failed. Please try again." 503, so a revoked or expired refresh
 * token looked identical to a transient glitch and nobody could tell from the
 * admin UI that the fix is re-running the credential helper. These tests pin
 * the classification table: invalid_grant/invalid_client/ADC-style failures
 * map to actionable re-mint guidance, quota/API-disabled/403 map to concrete
 * fixes, network errors to retry advice, and anything unrecognized stays
 * generic so internals never leak to the UI.
 *
 * classifyDriveError is pure (no googleapis calls), so the module imports
 * directly under Node's native type-stripping — no mocks needed.
 *
 * Run: node --test tests/upload-error-classify.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyDriveError } from "../src/lib/gdrive.ts";

describe("classifyDriveError", () => {
  it("treats an expired/revoked refresh token as an auth error with re-mint guidance", () => {
    const r = classifyDriveError(new Error("invalid_grant: Token has been expired or revoked."));
    assert.equal(r.kind, "auth");
    assert.match(r.error, /expired or was revoked/i);
    assert.match(r.action, /create_drive_credentials\.py/);
    assert.match(r.action, /GOOGLE_OAUTH_/);
  });

  it("treats bare invalid_grant as an auth error", () => {
    const r = classifyDriveError(new Error("invalid_grant"));
    assert.equal(r.kind, "auth");
    assert.match(r.error, /invalid_grant|rejected/i);
    assert.match(r.action, /create_drive_credentials\.py/);
  });

  it("reads googleapis response.data error fields too", () => {
    const r = classifyDriveError({
      response: { data: { error: "invalid_grant", error_description: "Token has been expired." } },
    });
    assert.equal(r.kind, "auth");
    assert.match(r.error, /expired or was revoked/i);
  });

  it("maps invalid_client to client-mismatch guidance", () => {
    const r = classifyDriveError({ response: { status: 401, data: { error: "invalid_client" } } });
    assert.equal(r.kind, "auth");
    assert.match(r.error, /client id\/secret|OAuth client/i);
    assert.match(r.action, /create_drive_credentials\.py/);
  });

  it("recognizes the buildAuth 'credentials are not configured' throw", () => {
    const r = classifyDriveError(
      new Error("Google Drive credentials are not configured. Set GOOGLE_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN.")
    );
    assert.equal(r.kind, "auth");
    assert.match(r.error, /No usable Google Drive credentials/i);
    assert.match(r.action, /create_drive_credentials\.py/);
  });

  it("maps a 401 from Drive to re-mint guidance", () => {
    const r = classifyDriveError({ code: 401, message: "Request had invalid authentication credentials." });
    assert.equal(r.kind, "auth");
    assert.match(r.action, /create_drive_credentials\.py/);
  });

  it("maps storageQuotaExceeded to a storage-quota fix", () => {
    const r = classifyDriveError(
      new Error("The user has exceeded their Drive storage quota (storageQuotaExceeded).")
    );
    assert.equal(r.kind, "api");
    assert.match(r.error, /out of quota/i);
    assert.match(r.action, /storage/i);
  });

  it("maps accessNotConfigured to enable-the-Drive-API guidance", () => {
    const r = classifyDriveError({
      response: {
        status: 403,
        data: { error: "accessNotConfigured", error_description: "Drive API has not been used in project" },
      },
    });
    assert.equal(r.kind, "api");
    assert.match(r.error, /not enabled/i);
    assert.match(r.action, /Enable the Drive API/i);
  });

  it("maps a 403 permission denial to concrete next steps with detail", () => {
    const r = classifyDriveError({
      code: 403,
      message: "The user does not have sufficient permissions for this operation.",
    });
    assert.equal(r.kind, "api");
    assert.match(r.error, /denied/i);
    assert.match(r.action, /sufficient permissions/i);
  });

  it("maps network errors to retry advice", () => {
    const r = classifyDriveError(
      new Error("request to https://oauth2.googleapis.com/token failed, reason: getaddrinfo ENOTFOUND")
    );
    assert.equal(r.kind, "network");
    assert.match(r.action, /retry/i);
  });

  it("keeps unknown failures generic so internals never leak to the UI", () => {
    const r = classifyDriveError(new Error("Something completely unexpected happened"));
    assert.equal(r.kind, "unknown");
    assert.equal(r.error, "Upload failed. Please try again.");
  });
});
