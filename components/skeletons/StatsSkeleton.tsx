import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";

export default function StatsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Market at a glance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2 rounded-lg border p-4">
              <div className="h-4 w-24 skeleton" />
              <div className="h-6 w-32 skeleton" />
              <div className="h-3 w-20 skeleton" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
