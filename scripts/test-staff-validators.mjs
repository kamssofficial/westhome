// Quick regex sanity tests for the staff-form validators (run: node scripts/test-staff-validators.mjs)
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^\+?[\d\s()-]{7,15}$/;

const emails = [
  ["sahil@gmail.com", true], ["admin@westhome.in", true], ["a.b+x@test.co", true],
  ["no-at-sign", false], ["@nope.com", false], ["spaces in@mail.com", false], ["ends@wrong", false],
];
const phones = [
  ["9633951144", true], ["+919633951144", true], ["+91 96339 51144", true],
  ["(04998) 12345", true], ["abcd123", false], ["123", false], ["notaphone", false],
];

let fail = 0;
for (const [v, want] of emails) { const got = emailRe.test(v); if (got !== want) { console.error(`EMAIL FAIL: "${v}" expected ${want}`); fail++; } }
for (const [v, want] of phones) { const got = phoneRe.test(v); if (got !== want) { console.error(`PHONE FAIL: "${v}" expected ${want}`); fail++; } }
console.log(fail === 0 ? "All validator tests pass ✅" : `${fail} test(s) FAILED`);
process.exit(fail === 0 ? 0 : 1);
