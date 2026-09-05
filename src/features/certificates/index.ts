import type { CertificateSpec, SectionSpec } from "./types";
import { TOEIC } from "./toeic";

export type { CertificateSpec, SectionSpec, ScoreResult, Skill } from "./types";
export { TOEIC };

export const CERTIFICATES: CertificateSpec[] = [TOEIC];

export function getCertificate(id: string): CertificateSpec {
  const c = CERTIFICATES.find((x) => x.id === id);
  if (!c) throw new Error("UNKNOWN_CERTIFICATE");
  return c;
}

export function getSection(cert: CertificateSpec, sectionId: string): SectionSpec | undefined {
  return cert.sections.find((s) => s.id === sectionId);
}
