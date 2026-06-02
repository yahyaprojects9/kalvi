import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/activity")({ component: ActivityPage });

function ActivityPage() {
  return (
    <Card className="p-8 text-center text-muted-foreground">
      Live activity will use backend session logs in the next prototype pass.
    </Card>
  );
}
