import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { Link } from "raviger";

import { query } from "@/lib/request";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

import { SeedRunArtifact, SeedRunSummary, demoSetupApi } from "@/api/demoSetup";

interface DemoSetupRunDetailPageProps {
  runId: string;
}

export default function DemoSetupRunDetailPage({
  runId,
}: DemoSetupRunDetailPageProps) {
  const runQuery = useQuery<SeedRunSummary>({
    queryKey: ["demoSetup", "run", runId],
    queryFn: query(demoSetupApi.runDetail, {
      pathParams: { id: runId },
    }),
    refetchInterval: (query) =>
      isInProgressStatus(query.state.data?.status) ? 2000 : false,
  });

  return (
    <div className="care-demo-facility-setup-fe-container min-h-screen bg-gray-50 p-6 text-gray-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <Button variant="ghost" asChild className="w-fit">
          <Link href="/admin/demo-facility-setup">
            <ArrowLeft className="size-4" />
            Back to demo setup
          </Link>
        </Button>

        {runQuery.isLoading && (
          <section className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <Loader2 className="mx-auto size-6 animate-spin text-primary-700" />
            <p className="mt-3 text-sm text-gray-600">Loading run details…</p>
          </section>
        )}

        {runQuery.isError && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-5" />
              <div>
                <h1 className="text-lg font-semibold">
                  Run details unavailable
                </h1>
                <p className="mt-1 text-sm opacity-80">
                  The selected seed run could not be found or loaded. Return to
                  the demo setup page and try again.
                </p>
              </div>
            </div>
          </section>
        )}

        {runQuery.data && <RunDetailPanel run={runQuery.data} />}
      </div>
    </div>
  );
}

function RunDetailPanel({ run }: { run: SeedRunSummary }) {
  const facilityArtifact = getMainFacilityArtifact(run);
  const facilityName = facilityArtifact
    ? getArtifactName(facilityArtifact.payload)
    : null;
  const facilityArtifacts =
    run.artifacts?.filter(
      (artifact) => artifact.resource_type === "Facility",
    ) ?? [];
  const patientArtifacts =
    run.artifacts?.filter((artifact) => artifact.resource_type === "Patient") ??
    [];
  const departmentArtifacts =
    run.artifacts?.filter(
      (artifact) => artifact.resource_type === "FacilityOrganization",
    ) ?? [];
  const locationArtifacts =
    run.artifacts?.filter(
      (artifact) => artifact.resource_type === "FacilityLocation",
    ) ?? [];
  const healthcareServiceArtifacts =
    run.artifacts?.filter(
      (artifact) => artifact.resource_type === "HealthcareService",
    ) ?? [];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              Run details
            </h1>
            <StatusPill status={run.status} />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            {run.pack_slug} / {run.profile_slug}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Created {formatDate(run.created_date)}
          </p>
        </div>

        <FacilityAction
          facilityArtifact={facilityArtifact}
          facilityName={facilityName}
          run={run}
        />
      </div>

      {run.error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">Run error</p>
          <p className="mt-1 whitespace-pre-wrap opacity-80">{run.error}</p>
        </div>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard label="Mode" value={run.dry_run ? "Dry run" : "Apply"} />
        <SummaryCard label="Facilities" value={facilityArtifacts.length} />
        <SummaryCard label="Patients" value={patientArtifacts.length} />
        <SummaryCard label="Departments" value={departmentArtifacts.length} />
        <SummaryCard label="Locations" value={locationArtifacts.length} />
        <SummaryCard
          label="Services"
          value={healthcareServiceArtifacts.length}
        />
      </div>

      {!!run.steps?.length && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-900">Steps</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            {run.steps.map((step) => (
              <div
                key={step.id}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-gray-900">{step.title}</p>
                  <StatusPill status={step.status} />
                </div>
                {step.message && (
                  <p className="mt-2 text-gray-600">{step.message}</p>
                )}
                {Object.keys(step.stats).length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {Object.entries(step.stats).map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1"
                      >
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          {key.replace(/_/g, " ")}
                        </p>
                        <p className="font-semibold text-gray-900">{value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {(run.artifacts?.length ?? 0) > 0 ? (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-900">
            Created resources
          </h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Ref</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">External ID</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {run.artifacts?.map((artifact) => (
                  <tr key={artifact.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {artifact.ref}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {artifact.resource_type}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {getArtifactName(artifact.payload)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {artifact.resource_external_id ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {isFacilityArtifact(artifact) &&
                      artifact.resource_external_id ? (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={getFacilityOverviewPath(
                              artifact.resource_external_id,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="View facility in a new tab"
                          >
                            View facility
                            <ExternalLink className="size-3" />
                          </a>
                        </Button>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          No resources have been created for this run yet.
        </div>
      )}
    </section>
  );
}

function FacilityAction({
  facilityArtifact,
  facilityName,
  run,
}: {
  facilityArtifact: SeedRunArtifact | undefined;
  facilityName: string | null;
  run: SeedRunSummary;
}) {
  if (facilityArtifact?.resource_external_id) {
    return (
      <div className="rounded-xl border border-primary-100 bg-primary-50 p-4 text-sm text-primary-900 lg:min-w-72">
        <p className="font-semibold">Created facility</p>
        <p className="mt-1 text-primary-800">
          {facilityName && facilityName !== "—"
            ? facilityName
            : facilityArtifact.resource_external_id}
        </p>
        <Button className="mt-3 w-full" asChild>
          <a
            href={getFacilityOverviewPath(
              facilityArtifact.resource_external_id,
            )}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View Facility in a new tab"
          >
            View Facility
            <ExternalLink className="size-4" />
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 lg:min-w-72">
      <p className="font-semibold text-gray-900">Facility link unavailable</p>
      <p className="mt-1">{getMissingFacilityMessage(run)}</p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const success = status === "succeeded";
  const failed = status.includes("failed");
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize",
        success && "bg-green-100 text-green-800",
        failed && "bg-red-100 text-red-800",
        !success && !failed && "bg-blue-100 text-blue-800",
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function getMainFacilityArtifact(run: SeedRunSummary) {
  const artifacts = run.artifacts ?? [];
  return (
    artifacts.find(
      (artifact) =>
        artifact.ref === "facility:main" && artifact.resource_external_id,
    ) ??
    artifacts.find(
      (artifact) =>
        artifact.resource_type === "Facility" && artifact.resource_external_id,
    )
  );
}

function isFacilityArtifact(artifact: SeedRunArtifact) {
  return (
    artifact.ref === "facility:main" || artifact.resource_type === "Facility"
  );
}

function getFacilityOverviewPath(facilityId: string) {
  return `/facility/${facilityId}/overview`;
}

function getMissingFacilityMessage(run: SeedRunSummary) {
  if (run.dry_run) {
    return "Dry runs validate the setup only, so no CARE facility is created.";
  }

  if (isInProgressStatus(run.status)) {
    return "The facility link will appear after the facility is created.";
  }

  return "No created facility artifact was recorded for this run.";
}

function getArtifactName(payload: Record<string, unknown>) {
  return typeof payload.name === "string" ? payload.name : "—";
}

function isInProgressStatus(status: string | undefined) {
  return status === "queued" || status === "running" || status === "validating";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
