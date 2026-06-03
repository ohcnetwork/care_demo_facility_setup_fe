import { PackagePlus } from "lucide-react";
import { createElement } from "react";

import routes from "./routes";

const manifest = {
  plugin: "care-demo-facility-setup-fe",
  routes,
  extends: [],
  adminNavItems: [
    {
      name: "Demo Setup",
      url: "/admin/demo-facility-setup",
      icon: createElement(PackagePlus, { className: "size-4" }),
    },
  ],
  components: {},
  devices: [],
} as const;

export default manifest;
