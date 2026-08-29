import { HttpMethod, apiRoutes } from "@/lib/request";

export interface SeedPackSummary {
  slug: string;
  name: string;
  version: string;
  description: string;
  counts: Record<string, number>;
}

export interface SeedProfileSummary {
  slug: string;
  name: string;
  description: string;
  allowed_hosts: string[];
}

export interface ValidationRequest {
  pack_slug: string;
  profile_slug: string;
}

export interface ValidationResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    pack_slug?: string;
    pack_name?: string;
    pack_version?: string;
    profile_slug?: string;
    profile_name?: string;
    host?: string | null;
    counts?: Record<string, number>;
    geo_organization_external_id?: string;
    resource_categories?: Record<string, string>;
  };
}

export interface SeedRunRequest extends ValidationRequest {
  dry_run: boolean;
}

export interface SeedRunStep {
  id: string;
  order: number;
  key: string;
  title: string;
  status: string;
  message: string;
  stats: Record<string, number>;
  started_date: string | null;
  finished_date: string | null;
}

export interface SeedRunArtifact {
  id: string;
  ref: string;
  resource_type: string;
  resource_external_id: string | null;
  slug: string;
  payload: Record<string, unknown>;
}

export interface SeedRunSummary {
  id: string;
  pack_slug: string;
  profile_slug: string;
  status: string;
  dry_run: boolean;
  summary: ValidationResponse["summary"];
  error: string;
  created_date: string | null;
  started_date: string | null;
  finished_date: string | null;
  request_payload?: SeedRunRequest;
  steps?: SeedRunStep[];
  artifacts?: SeedRunArtifact[];
}

export const demoSetupApi = apiRoutes({
  seedPacks: {
    method: HttpMethod.GET,
    path: "/api/care_demo_facility_setup/seed-packs/",
    TResponse: {} as { results: SeedPackSummary[] },
  },
  profiles: {
    method: HttpMethod.GET,
    path: "/api/care_demo_facility_setup/profiles/",
    TResponse: {} as { results: SeedProfileSummary[] },
  },
  validate: {
    method: HttpMethod.POST,
    path: "/api/care_demo_facility_setup/validate/",
    TRequest: {} as ValidationRequest,
    TResponse: {} as ValidationResponse,
  },
  runs: {
    method: HttpMethod.GET,
    path: "/api/care_demo_facility_setup/runs/",
    TResponse: {} as { results: SeedRunSummary[] },
  },
  runDetail: {
    method: HttpMethod.GET,
    path: "/api/care_demo_facility_setup/runs/{id}/",
    TResponse: {} as SeedRunSummary,
  },
  createRun: {
    method: HttpMethod.POST,
    path: "/api/care_demo_facility_setup/runs/",
    TRequest: {} as SeedRunRequest,
    TResponse: {} as SeedRunSummary,
  },
});
