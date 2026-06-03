import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  PackagePlus,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { HttpError, query, request } from "@/lib/request";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

import {
  SeedRunSummary,
  ValidationResponse,
  demoSetupApi,
} from "@/api/demoSetup";

const DEFAULT_PACK = "generic_hospital_v1";
const DEFAULT_PROFILE = "local";

export default function DemoSetupPage() {
  const queryClient = useQueryClient();
  const [packSlug, setPackSlug] = useState(DEFAULT_PACK);
  const [profileSlug, setProfileSlug] = useState(DEFAULT_PROFILE);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResponse | null>(null);

  const seedPacksQuery = useQuery({
    queryKey: ["demoSetup", "seedPacks"],
    queryFn: query(demoSetupApi.seedPacks),
  });

  const profilesQuery = useQuery({
    queryKey: ["demoSetup", "profiles", packSlug],
    queryFn: query(demoSetupApi.profiles, {
      queryParams: { pack_slug: packSlug },
    }),
  });

  const runsQuery = useQuery({
    queryKey: ["demoSetup", "runs"],
    queryFn: query(demoSetupApi.runs),
  });

  const activeRunQuery = useQuery({
    queryKey: ["demoSetup", "run", activeRunId],
    queryFn: query(demoSetupApi.runDetail, {
      pathParams: { id: activeRunId ?? "" },
    }),
    enabled: !!activeRunId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" ||
        status === "running" ||
        status === "validating"
        ? 2000
        : false;
    },
  });

  useEffect(() => {
    const profiles = profilesQuery.data?.results;
    const preferredProfile =
      profiles?.find((profile) => profile.slug === profileSlug)?.slug ??
      profiles?.find((profile) => profile.slug === DEFAULT_PROFILE)?.slug ??
      profiles?.[0]?.slug;
    if (
      preferredProfile &&
      !profiles?.some((profile) => profile.slug === profileSlug)
    ) {
      setProfileSlug(preferredProfile);
    }
  }, [profileSlug, profilesQuery.data?.results]);

  const selectedPack = useMemo(
    () => seedPacksQuery.data?.results.find((pack) => pack.slug === packSlug),
    [packSlug, seedPacksQuery.data?.results],
  );

  const selectedProfile = useMemo(
    () =>
      profilesQuery.data?.results.find(
        (profile) => profile.slug === profileSlug,
      ),
    [profileSlug, profilesQuery.data?.results],
  );

  const validateMutation = useMutation({
    mutationFn: () =>
      request(demoSetupApi.validate, {
        body: {
          pack_slug: packSlug,
          profile_slug: profileSlug,
        },
        silent: true,
      }),
    onSuccess: setValidation,
    onError: (error) => {
      if (error instanceof HttpError && error.cause) {
        setValidation(error.cause as unknown as ValidationResponse);
      }
    },
  });

  const handleRunCreated = (run: SeedRunSummary) => {
    setActiveRunId(run.id);
    setValidation({
      valid: run.status !== "validation_failed",
      errors: run.error ? [run.error] : [],
      warnings: [],
      summary: run.summary,
    });
    queryClient.invalidateQueries({ queryKey: ["demoSetup", "runs"] });
    queryClient.invalidateQueries({ queryKey: ["demoSetup", "run", run.id] });
  };

  const handleRunError = (error: Error) => {
    if (error instanceof HttpError && error.cause) {
      const run = error.cause as unknown as SeedRunSummary;
      setValidation({
        valid: false,
        errors: run.error
          ? [run.error]
          : [
              (error.cause.detail as string | undefined) ??
                "Seed run could not be created.",
            ],
        warnings: [],
        summary: run.summary ?? {},
      });
      queryClient.invalidateQueries({ queryKey: ["demoSetup", "runs"] });
    }
  };

  const createDryRunMutation = useMutation({
    mutationFn: () =>
      request(demoSetupApi.createRun, {
        body: {
          pack_slug: packSlug,
          profile_slug: profileSlug,
          dry_run: true,
        },
        silent: true,
      }),
    onSuccess: handleRunCreated,
    onError: handleRunError,
  });

  const createRealRunMutation = useMutation({
    mutationFn: () =>
      request(demoSetupApi.createRun, {
        body: {
          pack_slug: packSlug,
          profile_slug: profileSlug,
          dry_run: false,
        },
        silent: true,
      }),
    onSuccess: handleRunCreated,
    onError: handleRunError,
  });

  const createRealRun = () => {
    const confirmed = window.confirm(
      "This will create one new demo facility and ten patients in CARE. Continue?",
    );
    if (confirmed) {
      createRealRunMutation.mutate();
    }
  };

  return (
    <div className="care-demo-facility-setup-fe-container min-h-screen bg-gray-50 p-6 text-gray-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary-700">
                <PackagePlus className="size-4" />
                CARE Demo Facility Setup
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Seed a demo facility
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-gray-600">
                Validate the packaged seed pack against the selected profile,
                then create an auditable run. Milestone 1 creates one facility
                and ten patients through CARE's own APIs.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => runsQuery.refetch()}
              disabled={runsQuery.isFetching}
            >
              <RefreshCw
                className={cn("size-4", runsQuery.isFetching && "animate-spin")}
              />
              Refresh runs
            </Button>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Seed configuration</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Seed pack
                <select
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-xs focus:border-primary-600 focus:outline-hidden focus:ring-2 focus:ring-primary-100"
                  value={packSlug}
                  onChange={(event) => setPackSlug(event.target.value)}
                >
                  {seedPacksQuery.data?.results.map((pack) => (
                    <option key={pack.slug} value={pack.slug}>
                      {pack.name} ({pack.version})
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Profile
                <select
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-xs focus:border-primary-600 focus:outline-hidden focus:ring-2 focus:ring-primary-100"
                  value={profileSlug}
                  onChange={(event) => setProfileSlug(event.target.value)}
                >
                  {profilesQuery.data?.results.map((profile) => (
                    <option key={profile.slug} value={profile.slug}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 md:col-span-2">
                The selected profile controls where this seed can run. CARE host
                validation uses the backend request host, so admins do not need
                to enter a CARE API URL.
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                variant="outline_primary"
                onClick={() => validateMutation.mutate()}
                disabled={
                  validateMutation.isPending || !packSlug || !profileSlug
                }
              >
                {validateMutation.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Validate setup
              </Button>
              <Button
                variant="outline"
                onClick={() => createDryRunMutation.mutate()}
                disabled={
                  createDryRunMutation.isPending || !packSlug || !profileSlug
                }
              >
                {createDryRunMutation.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Create dry run
              </Button>
              <Button
                onClick={createRealRun}
                disabled={
                  createRealRunMutation.isPending || !packSlug || !profileSlug
                }
              >
                {createRealRunMutation.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Create facility + patients
              </Button>
            </div>

            {validation && <ValidationPanel validation={validation} />}
          </div>

          <aside className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Selected pack</h2>
            {selectedPack ? (
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedPack.name}
                  </p>
                  <p className="text-gray-500">
                    Version {selectedPack.version}
                  </p>
                </div>
                <p className="text-gray-600">{selectedPack.description}</p>
                <CountsGrid counts={selectedPack.counts} />
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">Loading seed pack…</p>
            )}

            {selectedProfile && (
              <div className="mt-6 border-t border-gray-200 pt-5 text-sm">
                <h3 className="font-semibold text-gray-900">
                  Profile guardrails
                </h3>
                <p className="mt-2 text-gray-600">
                  {selectedProfile.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedProfile.allowed_hosts.map((host) => (
                    <span
                      key={host}
                      className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
                    >
                      {host}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </section>

        {activeRunQuery.data && <RunDetailPanel run={activeRunQuery.data} />}

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Recent seed runs</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Pack</th>
                  <th className="px-4 py-3">Profile</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {runsQuery.data?.results.map((run) => (
                  <tr key={run.id}>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(run.created_date)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {run.pack_slug}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {run.profile_slug}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={run.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {run.dry_run ? "Dry run" : "Apply"}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveRunId(run.id)}
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
                {!runsQuery.data?.results.length && (
                  <tr>
                    <td
                      className="px-4 py-6 text-center text-gray-500"
                      colSpan={6}
                    >
                      No seed runs yet. Create a dry run to verify the pipeline.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function RunDetailPanel({ run }: { run: SeedRunSummary }) {
  const facilityArtifacts =
    run.artifacts?.filter(
      (artifact) => artifact.resource_type === "Facility",
    ) ?? [];
  const patientArtifacts =
    run.artifacts?.filter((artifact) => artifact.resource_type === "Patient") ??
    [];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Run details</h2>
          <p className="mt-1 text-sm text-gray-600">
            {run.pack_slug} / {run.profile_slug}
          </p>
        </div>
        <StatusPill status={run.status} />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <SummaryCard label="Mode" value={run.dry_run ? "Dry run" : "Apply"} />
        <SummaryCard label="Facilities" value={facilityArtifacts.length} />
        <SummaryCard label="Patients" value={patientArtifacts.length} />
      </div>

      {!!run.steps?.length && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-900">Steps</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
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
              </div>
            ))}
          </div>
        </div>
      )}

      {!!run.artifacts?.length && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-900">
            Created resources
          </h3>
          <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Ref</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">External ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {run.artifacts.map((artifact) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
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

function getArtifactName(payload: Record<string, unknown>) {
  return typeof payload.name === "string" ? payload.name : "—";
}

function ValidationPanel({ validation }: { validation: ValidationResponse }) {
  return (
    <div
      className={cn(
        "mt-6 rounded-xl border p-4 text-sm",
        validation.valid
          ? "border-green-200 bg-green-50 text-green-900"
          : "border-red-200 bg-red-50 text-red-900",
      )}
    >
      <div className="flex items-start gap-3">
        {validation.valid ? (
          <CheckCircle2 className="mt-0.5 size-5" />
        ) : (
          <AlertCircle className="mt-0.5 size-5" />
        )}
        <div className="space-y-3">
          <div>
            <p className="font-semibold">
              {validation.valid ? "Validation passed" : "Validation failed"}
            </p>
            <p className="mt-1 opacity-80">
              {validation.summary.pack_name ?? validation.summary.pack_slug} /{" "}
              {validation.summary.profile_name ??
                validation.summary.profile_slug}
            </p>
          </div>
          {!!validation.errors.length && (
            <ul className="list-disc space-y-1 pl-5">
              {validation.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
          {!!validation.warnings.length && (
            <ul className="list-disc space-y-1 pl-5 text-amber-800">
              {validation.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
          {validation.summary.counts && (
            <CountsGrid counts={validation.summary.counts} />
          )}
        </div>
      </div>
    </div>
  );
}

function CountsGrid({ counts }: { counts: Record<string, number> }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {Object.entries(counts).map(([key, value]) => (
        <div
          key={key}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2"
        >
          <p className="text-xs uppercase tracking-wide text-gray-500">
            {key.replace(/_/g, " ")}
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
        </div>
      ))}
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

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
