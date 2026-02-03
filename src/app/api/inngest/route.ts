import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { functions } from "@/lib/inngest/functions";

// Serve all Inngest functions at /api/inngest
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
