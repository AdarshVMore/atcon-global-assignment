import { Briefcase, GraduationCap, Mail, Phone } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Resume } from "@/types/candidates";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

interface CandidateProfileViewProps {
  name: string;
  email: string;
  phone: string | null;
  /** The one resume relevant to this context (e.g. the one an application used) — not a list to pick from. */
  resume: Resume | null;
}

export function CandidateProfileView({ name, email, phone, resume }: CandidateProfileViewProps) {
  const structured = resume?.status === "PARSED" ? (resume.parsedData?.structured ?? null) : null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar size="lg" className="mt-0.5">
              <AvatarFallback className="text-base font-medium">{initials(name)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">{name}</h2>
              {structured?.summary && (
                <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{structured.summary}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Mail className="size-3.5" /> {email}
                </span>
                {phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3.5" /> {phone}
                  </span>
                )}
                {structured?.yearsOfExperience !== null && structured?.yearsOfExperience !== undefined && (
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="size-3.5" /> {structured.yearsOfExperience} yrs experience
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!structured && (
        <p className="text-sm text-muted-foreground">
          {resume?.status === "FAILED"
            ? "This resume couldn't be parsed — skills, experience and education aren't available for it."
            : resume
              ? "This resume hasn't finished parsing yet — skills, experience and education will show up here once it has."
              : "No parsed resume on file yet — skills, experience and education will show up here once one's uploaded and processed."}
        </p>
      )}

      {structured && (
        <div className="grid gap-4 md:grid-cols-2">
          {structured.skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {structured.skills.map((skill) => (
                    <Badge key={skill} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {structured.education.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Education</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-3">
                  {structured.education.map((entry, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <GraduationCap className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{entry.institution}</p>
                        {entry.degree && <p className="text-xs text-muted-foreground">{entry.degree}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {structured.workExperience.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Experience</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="flex flex-col gap-4 border-l pl-4">
                  {structured.workExperience.map((entry, index) => (
                    <li key={index} className="relative">
                      <span className="absolute -left-[21px] top-1 size-2 rounded-full bg-[var(--viz-series-1)]" />
                      <p className="text-sm font-medium">
                        {entry.title ?? "Role"} {entry.company && <span className="text-muted-foreground">· {entry.company}</span>}
                      </p>
                      {entry.durationYears !== null && (
                        <p className="text-xs text-muted-foreground">
                          {entry.durationYears} year{entry.durationYears === 1 ? "" : "s"}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
