import DemoSetupPage from "@/pages/DemoSetupPage";
import DemoSetupRunDetailPage from "@/pages/DemoSetupRunDetailPage";

const routes = {
  "/admin/demo-facility-setup": () => <DemoSetupPage />,
  "/admin/demo-facility-setup/runs/:runId": ({ runId }: { runId: string }) => (
    <DemoSetupRunDetailPage runId={runId} />
  ),
};

export default routes;
