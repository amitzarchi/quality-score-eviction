"use client"

import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Rectangle, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export const description = "A bar chart showing average throughput by cache policy"

const chartData = [
  { policy: "Quality Score", throughput: 3.162485305789564, fill: "var(--color-chart-1)" },
  { policy: "LRU", throughput: 2.7605666538747955, fill: "var(--color-chart-2)" },
  { policy: "LFU", throughput: 2.440559747764914, fill: "var(--color-chart-3)" },
  { policy: "FIFO", throughput: 5.016509398854298, fill: "var(--color-chart-4)" },
  { policy: "RR", throughput: 4.81771092822417, fill: "var(--color-chart-5)" },
]

const chartConfig = {
  throughput: {
    label: "Throughput (req/s)",
  },
  "Quality Score": {
    label: "Quality Score",
    color: "var(--color-chart-1)",
  },
  LRU: {
    label: "LRU",
    color: "var(--color-chart-2)",
  },
  LFU: {
    label: "LFU",
    color: "var(--color-chart-3)",
  },
  FIFO: {
    label: "FIFO",
    color: "var(--color-chart-4)",
  },
  RR: {
    label: "RR",
    color: "var(--color-chart-5)",
  },
} satisfies ChartConfig

export function ThroughputChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cache Policy Throughput Comparison</CardTitle>
        <CardDescription>Average requests per second by eviction policy</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={chartData} margin={{ left: -20, right: 20 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="policy"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value.toFixed(1)}`}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent 
                formatter={(value) => [`${Number(value).toFixed(3)} req/s`]}
                hideLabel={false}
              />}
            />
            <Bar activeIndex={0}
                          activeBar={({ ...props }) => {
                            return (
                              <Rectangle
                                {...props}
                                fillOpacity={0.8}
                                stroke={props.payload.fill}
                                strokeDasharray={5}
                                strokeDashoffset={4}
                              />
                            )
                          }}
            dataKey="throughput" radius={8} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Quality Score maintains competitive throughput with intelligent eviction <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Quality Score achieves 3.16 req/s 
        </div>
      </CardFooter>
    </Card>
  )
}
