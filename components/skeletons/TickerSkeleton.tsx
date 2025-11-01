import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";

export default function TickerSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Live prices</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-6 w-28 skeleton" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
