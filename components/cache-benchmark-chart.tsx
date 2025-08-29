"use client"

import { useState, useMemo } from "react"
import { TrendingUp } from "lucide-react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

// Import the benchmark data
import benchmarkData from "@/lib/benchmark_results.json"

export const description = "Cache eviction policy benchmark comparison"

type BenchmarkResult = {
  id: number
  number_of_questions: number
  degree_of_repetition: "HIGH" | "LOW" | "MIXED"
  eviction_base: "quality_score" | "memory"
  eviction_policy: "quality_score" | "LRU" | "LFU" | "FIFO" | "RR"
  max_size: number
  learning_rate: number | null
  quality_weight: number | null
  recency_weight: number | null
  frequency_weight: number | null
  hit_rate: number
  timestamp: string
}

type ChartDataPoint = {
  max_size: number
  quality_score: number
  LRU: number
  LFU: number
  FIFO: number
  RR: number
}

const chartConfig = {
  quality_score: {
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

export function CacheBenchmarkChart() {
  const [selectedRepetition, setSelectedRepetition] = useState<"HIGH" | "LOW" | "MIXED">("HIGH")
  const [selectedQuestions, setSelectedQuestions] = useState<number>(500)
  const [selectedLearningRate, setSelectedLearningRate] = useState<number>(0.5)
  const [selectedWeights, setSelectedWeights] = useState<"0.6,0.3,0.1" | "0.8,0.1,0.1">("0.6,0.3,0.1")

  const data = benchmarkData as BenchmarkResult[]

  const chartData = useMemo(() => {
    // Get unique max_size values for the selected filters
    const uniqueSizes = [...new Set(data
      .filter(d => 
        d.number_of_questions === selectedQuestions &&
        d.degree_of_repetition === selectedRepetition
      )
      .map(d => d.max_size)
    )].sort((a, b) => a - b)

    return uniqueSizes.map(size => {
      const dataPoint: ChartDataPoint = {
        max_size: size,
        quality_score: 0,
        LRU: 0,
        LFU: 0,
        FIFO: 0,
        RR: 0,
      }

      // Find quality_score result with selected parameters
      const [qualityWeight, recencyWeight, frequencyWeight] = selectedWeights.split(',').map(Number)
      const qualityScoreResult = data.find(d =>
        d.number_of_questions === selectedQuestions &&
        d.degree_of_repetition === selectedRepetition &&
        d.eviction_policy === "quality_score" &&
        d.max_size === size &&
        d.learning_rate === selectedLearningRate &&
        Math.abs((d.quality_weight || 0) - qualityWeight) < 0.01 &&
        Math.abs((d.recency_weight || 0) - recencyWeight) < 0.01 &&
        Math.abs((d.frequency_weight || 0) - frequencyWeight) < 0.01
      )

      if (qualityScoreResult) {
        dataPoint.quality_score = qualityScoreResult.hit_rate
      }

      // Find baseline eviction policies
      const baselinePolicies = ["LRU", "LFU", "FIFO", "RR"] as const
      baselinePolicies.forEach(policy => {
        const baselineResult = data.find(d =>
          d.number_of_questions === selectedQuestions &&
          d.degree_of_repetition === selectedRepetition &&
          d.eviction_policy === policy &&
          d.max_size === size
        )
        
        if (baselineResult) {
          dataPoint[policy] = baselineResult.hit_rate
        }
      })

      return dataPoint
    }).filter(d => 
      // Only include data points where we have at least quality_score and one baseline
      d.quality_score > 0 && (d.LRU > 0 || d.LFU > 0 || d.FIFO > 0 || d.RR > 0)
    )
  }, [selectedRepetition, selectedQuestions, selectedLearningRate, selectedWeights, data])

  const bestPerformingPolicy = useMemo(() => {
    if (chartData.length === 0) return null
    
    const avgHitRates = {
      quality_score: chartData.reduce((sum, d) => sum + d.quality_score, 0) / chartData.length,
      LRU: chartData.reduce((sum, d) => sum + d.LRU, 0) / chartData.length,
      LFU: chartData.reduce((sum, d) => sum + d.LFU, 0) / chartData.length,
      FIFO: chartData.reduce((sum, d) => sum + d.FIFO, 0) / chartData.length,
      RR: chartData.reduce((sum, d) => sum + d.RR, 0) / chartData.length,
    }

    const best = Object.entries(avgHitRates).reduce((a, b) => 
      avgHitRates[a[0] as keyof typeof avgHitRates] > avgHitRates[b[0] as keyof typeof avgHitRates] ? a : b
    )

    return {
      policy: best[0],
      rate: best[1],
      improvement: ((best[1] - Math.max(...Object.values(avgHitRates).filter((_, i) => i !== Object.keys(avgHitRates).indexOf(best[0])))) / Math.max(...Object.values(avgHitRates).filter((_, i) => i !== Object.keys(avgHitRates).indexOf(best[0])))) * 100
    }
  }, [chartData])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Cache Eviction Policy Benchmark</CardTitle>
        <CardDescription>
          Comparing Quality Score eviction against baseline policies (LRU, LFU, FIFO, RR)
        </CardDescription>
        
        {/* Filter Controls */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="repetition">Degree of Repetition</Label>
            <Select value={selectedRepetition} onValueChange={(value: "HIGH" | "LOW" | "MIXED") => setSelectedRepetition(value)}>
              <SelectTrigger id="repetition">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HIGH">HIGH</SelectItem>
                <SelectItem value="LOW">LOW</SelectItem>
                <SelectItem value="MIXED">MIXED</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="questions">Number of Questions</Label>
            <Select value={selectedQuestions.toString()} onValueChange={(value) => setSelectedQuestions(Number(value))}>
              <SelectTrigger id="questions">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="500">500</SelectItem>
                <SelectItem value="1000">1000</SelectItem>
                <SelectItem value="3000">3000</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="learning-rate">Learning Rate</Label>
            <Select value={selectedLearningRate.toString()} onValueChange={(value) => setSelectedLearningRate(Number(value))}>
              <SelectTrigger id="learning-rate">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.3">0.3</SelectItem>
                <SelectItem value="0.5">0.5</SelectItem>
                <SelectItem value="0.7">0.7</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weights">Weights (Q,R,F)</Label>
            <Select value={selectedWeights} onValueChange={(value: "0.6,0.3,0.1" | "0.8,0.1,0.1") => setSelectedWeights(value)}>
              <SelectTrigger id="weights">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.6,0.3,0.1">(0.6, 0.3, 0.1)</SelectItem>
                <SelectItem value="0.8,0.1,0.1">(0.8, 0.1, 0.1)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="max_size"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value}`}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
            />
            <ChartTooltip 
              cursor={false} 
              content={<ChartTooltipContent 
                // formatter={(value, name) => [
                //   `${(Number(value) * 100).toFixed(1)}%`,
                //   chartConfig[name as keyof typeof chartConfig]?.label || name
                // ]}
                labelFormatter={(label) => `Hit Rate`}
              />} 
            />
            
            <Line
              dataKey="quality_score"
              type="monotone"
              stroke="var(--color-quality_score)"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
            <Line
              dataKey="LRU"
              type="monotone"
              stroke="var(--color-LRU)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              dataKey="LFU"
              type="monotone"
              stroke="var(--color-LFU)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              dataKey="FIFO"
              type="monotone"
              stroke="var(--color-FIFO)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              dataKey="RR"
              type="monotone"
              stroke="var(--color-RR)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>

      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            {bestPerformingPolicy && (
              <div className="flex items-center gap-2 leading-none font-medium">
                {bestPerformingPolicy.policy === "quality_score" ? (
                  <>Quality Score outperforms baselines by {bestPerformingPolicy.improvement.toFixed(1)}% <TrendingUp className="h-4 w-4" /></>
                ) : (
                  <>Best performing: {chartConfig[bestPerformingPolicy.policy as keyof typeof chartConfig]?.label}</>
                )}
              </div>
            )}
            <div className="text-muted-foreground flex items-center gap-2 leading-none">
              Hit rate comparison across different cache sizes • {selectedRepetition} repetition • {selectedQuestions} questions
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
