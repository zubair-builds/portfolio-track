import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";

export default function SymbolsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Browse symbols</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 w-full skeleton" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
