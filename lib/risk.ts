const HIGH_RISK_SCOPES = new Set([
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/contacts",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/admin.directory.user",
  "Mail.Read",
  "Mail.ReadWrite",
  "Contacts.Read",
  "Files.ReadWrite.All",
  "Directory.ReadWrite.All",
]);

const MEDIUM_RISK_SCOPES = new Set([
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "Calendars.Read",
  "Files.Read.All",
]);

export function calculateRiskScore(scopes: string[]): number {
  let score = 20;
  for (const scope of scopes) {
    if (HIGH_RISK_SCOPES.has(scope)) score = Math.min(score + 25, 100);
    else if (MEDIUM_RISK_SCOPES.has(scope)) score = Math.min(score + 10, 100);
  }
  return score;
}
