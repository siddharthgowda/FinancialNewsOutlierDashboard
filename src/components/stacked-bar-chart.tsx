'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface StackedBarChartProps {
  normal: number
  outlier: number
  width?: number
  height?: number
}

export function StackedBarChart({ normal, outlier, width = 300, height = 60 }: StackedBarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const total = normal + outlier
    if (total === 0) return

    const normalPercent = (normal / total) * 100
    const outlierPercent = (outlier / total) * 100

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
    const margin = { top: 15, right: 15, bottom: 15, left: 15 }
    const chartWidth = width - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Create stacked bar
    const barHeight = chartHeight
    const barWidth = chartWidth

    // Normal segment (green)
    if (normalPercent > 0) {
      g.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', (barWidth * normalPercent) / 100)
        .attr('height', barHeight)
        .attr('fill', '#10b981') // green-500
        .attr('rx', 4)
    }

    // Outlier segment (red)
    if (outlierPercent > 0) {
      g.append('rect')
        .attr('x', (barWidth * normalPercent) / 100)
        .attr('y', 0)
        .attr('width', (barWidth * outlierPercent) / 100)
        .attr('height', barHeight)
        .attr('fill', '#ef4444') // red-500
        .attr('rx', 4)
    }

    // Add labels if there's enough space
    if (normalPercent > 10) {
      g.append('text')
        .attr('x', (barWidth * normalPercent) / 200)
        .attr('y', barHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', 'white')
        .attr('font-size', '18px')
        .attr('font-weight', '600')
        .text(`${normalPercent.toFixed(1)}%`)
    }

    if (outlierPercent > 10) {
      g.append('text')
        .attr('x', (barWidth * normalPercent) / 100 + (barWidth * outlierPercent) / 200)
        .attr('y', barHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', 'white')
        .attr('font-size', '18px')
        .attr('font-weight', '600')
        .text(`${outlierPercent.toFixed(1)}%`)
    }
  }, [normal, outlier, width, height])

  return (
    <div className="w-full overflow-x-auto">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full max-w-full"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      />
    </div>
  )
}

