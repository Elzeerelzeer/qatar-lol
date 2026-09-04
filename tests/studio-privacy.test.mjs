import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const studioSource = pageSource.slice(
  pageSource.indexOf("function PhotoStudio"),
  pageSource.indexOf("const majlisRiddles"),
);

test("keeps visitor photos inside the browser privacy boundary", () => {
  assert.match(studioSource, /canvas\.toBlob/);
  assert.match(studioSource, /URL\.createObjectURL/);
  assert.match(studioSource, /URL\.revokeObjectURL/);
  assert.match(studioSource, /getUserMedia\(\{ video:/);
  assert.match(studioSource, /audio: false/);

  assert.doesNotMatch(studioSource, /toDataURL|FileReader|readAsDataURL/);
  assert.doesNotMatch(studioSource, /fetch\s*\(|XMLHttpRequest|FormData|sendBeacon|WebSocket|EventSource/);
  assert.doesNotMatch(studioSource, /localStorage|sessionStorage|indexedDB/);
});

test("requires an explicit privacy confirmation before requesting the camera", () => {
  assert.match(studioSource, /onClick=\{openCameraPrivacyNotice\}/);
  assert.match(studioSource, /خصوصيتك تهمنا 🔒/);
  assert.match(studioSource, /السماح وفتح الكاميرا/);
  assert.match(studioSource, />إلغاء<\/button>/);
  assert.equal((studioSource.match(/getUserMedia/g) ?? []).length, 2);
});

test("cleans camera and temporary URLs when the studio is left or closed", () => {
  assert.match(studioSource, /getTracks\(\)\.forEach\(track => track\.stop\(\)\)/);
  assert.match(studioSource, /streamRef\.current = null/);
  assert.match(studioSource, /videoRef\.current\.srcObject = null/);
  assert.match(studioSource, /window\.addEventListener\("pagehide", clearOnPageHide\)/);
  assert.match(studioSource, /const leaveStudio = \(\) => \{[\s\S]*?clearImageMemory\(\)/);
  assert.match(studioSource, /const retakePhoto = \(\) => \{[\s\S]*?clearImageMemory\(\)/);
});
