import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CostsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Costs & Usage</h1>
        <p className="text-neutral-400">Track API spend and token usage</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-neutral-400">This Week</CardDescription>
            <CardTitle className="text-2xl text-white">$18.42</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-neutral-500">~$2.63/day average</p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-neutral-400">This Month</CardDescription>
            <CardTitle className="text-2xl text-white">$45.80</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-neutral-500">7 days in</p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-neutral-400">Total Tokens</CardDescription>
            <CardTitle className="text-2xl text-white">2.4M</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-neutral-500">1.8M input / 600K output</p>
          </CardContent>
        </Card>
      </div>

      {/* Cost breakdown placeholder */}
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-white">Cost by Model</CardTitle>
          <CardDescription className="text-neutral-400">Breakdown of spending per model</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { model: "Claude Opus", cost: "$28.50", percent: 62, color: "bg-purple-500" },
              { model: "Claude Sonnet", cost: "$14.20", percent: 31, color: "bg-blue-500" },
              { model: "Groq (Free)", cost: "$0.00", percent: 7, color: "bg-green-500" },
            ].map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white">{item.model}</span>
                  <span className="text-neutral-400">{item.cost} ({item.percent}%)</span>
                </div>
                <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color} rounded-full`}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
