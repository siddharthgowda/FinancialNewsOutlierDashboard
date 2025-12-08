'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import cloud from 'd3-cloud'

interface WordCloudProps {
  words: { text: string; size: number }[]
  width?: number
  height?: number
}

export function WordCloud({ words, width = 700, height = 400 }: WordCloudProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || words.length === 0) return

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
    // Center the group - d3-cloud coordinates are centered around (0,0)
    const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`)

    // Set up the cloud layout
    const layout = cloud()
      .size([width, height])
      .words(
        words.map((d) => ({
          text: d.text,
          size: d.size,
        }))
      )
      .padding(5)
      .rotate(() => (~~(Math.random() * 2) * 90)) // Random rotation: 0 or 90 degrees
      .font('sans-serif')
      .fontSize((d) => Math.max(10, d.size ?? 30)) // Ensure minimum size
      .on('end', draw)

    layout.start()

    function draw(cloudWords: Array<{ text?: string; size?: number; x?: number; y?: number; rotate?: number }>) {
      if (!cloudWords || cloudWords.length === 0) {
        console.warn('WordCloud: No words to draw')
        return
      }

      g.selectAll('text')
        .data(cloudWords)
        .enter()
        .append('text')
        .style('font-size', (d) => `${Math.max(10, d.size ?? 30)}px`)
        .style('font-family', 'sans-serif')
        .style('fill', (d, i) => {
          // Color scheme: use a gradient of colors
          const colors = [
            '#1f77b4',
            '#ff7f0e',
            '#2ca02c',
            '#d62728',
            '#9467bd',
            '#8c564b',
            '#e377c2',
            '#7f7f7f',
            '#bcbd22',
            '#17becf',
          ]
          return colors[i % colors.length]
        })
        .attr('text-anchor', 'middle')
        .attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})rotate(${d.rotate ?? 0})`)
        .text((d) => d.text ?? '')
    }
  }, [words, width, height])

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="w-full h-auto"
      viewBox={`0 0 ${width} ${height}`}
    />
  )
}

