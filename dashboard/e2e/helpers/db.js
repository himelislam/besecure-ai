import { execFileSync } from "node:child_process";

// Shells out to mongosh rather than adding a `mongodb` driver dependency
// just for test setup — matches the pattern already proven out manually
// against this exact backend earlier in the project. Requires `mongosh` on
// PATH and access to the same Mongo instance the backend/worker use.
const MONGO_URI = process.env.E2E_MONGODB_URI || "mongodb://localhost:27017/security-platform";

function mongoEval(script) {
  return execFileSync("mongosh", [MONGO_URI, "--quiet", "--eval", script], {
    encoding: "utf-8",
  }).trim();
}

export function getEmailVerificationToken(email) {
  const script = `const u = db.users.findOne({email: ${JSON.stringify(email)}}); print(u ? u.emailVerificationToken : "");`;
  const token = mongoEval(script);
  if (!token) {
    throw new Error(`No emailVerificationToken found for ${email} — was registration actually persisted?`);
  }
  return token;
}
