'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface StackedBarChartProps {
  positive: number
  negative: number
  neutral: number
  width?: number
  height?: number
}

export function StackedBarChart({ positive, negative, neutral, width = 300, height = 60 }: StackedBarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const total = positive + negative + neutral
    if (total === 0) return

    const positivePercent = (positive / total) * 100
    const negativePercent = (negative / total) * 100
    const neutralPercent = (neutral / total) * 100

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

    let currentX = 0

    // Positive segment (green)
    if (positivePercent > 0) {
      const segmentWidth = (barWidth * positivePercent) / 100
      g.append('rect')
        .attr('x', currentX)
        .attr('y', 0)
        .attr('width', segmentWidth)
        .attr('height', barHeight)
        .attr('fill', '#10b981') // green-500
        .attr('rx', 4)
      
      if (positivePercent > 8) {
        g.append('text')
          .attr('x', currentX + segmentWidth / 2)
          .attr('y', barHeight / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', 'white')
          .attr('font-size', '18px')
          .attr('font-weight', '600')
          .text(`${positivePercent.toFixed(1)}%`)
      }
      currentX += segmentWidth
    }

    // Neutral segment (gray)
    if (neutralPercent > 0) {
      const segmentWidth = (barWidth * neutralPercent) / 100
      g.append('rect')
        .attr('x', currentX)
        .attr('y', 0)
        .attr('width', segmentWidth)
        .attr('height', barHeight)
        .attr('fill', '#6b7280') // gray-500
        .attr('rx', 4)
      
      if (neutralPercent > 8) {
        g.append('text')
          .attr('x', currentX + segmentWidth / 2)
          .attr('y', barHeight / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', 'white')
          .attr('font-size', '18px')
          .attr('font-weight', '600')
          .text(`${neutralPercent.toFixed(1)}%`)
      }
      currentX += segmentWidth
    }

    // Negative segment (red)
    if (negativePercent > 0) {
      const segmentWidth = (barWidth * negativePercent) / 100
      g.append('rect')
        .attr('x', currentX)
        .attr('y', 0)
        .attr('width', segmentWidth)
        .attr('height', barHeight)
        .attr('fill', '#ef4444') // red-500
        .attr('rx', 4)
      
      if (negativePercent > 8) {
        g.append('text')
          .attr('x', currentX + segmentWidth / 2)
          .attr('y', barHeight / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', 'white')
          .attr('font-size', '18px')
          .attr('font-weight', '600')
          .text(`${negativePercent.toFixed(1)}%`)
      }
    }
  }, [positive, negative, neutral, width, height])

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

