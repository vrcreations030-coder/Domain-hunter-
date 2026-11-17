import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import type {
  PremiumPriceTrend,
  PriceHistoryPoint,
  RdapDomainPoint,
  RdapScanSnapshot
} from '../types/domain';
import { fetchPremiumPriceHistory } from '../utils/rdap';

interface RadarChartsProps {
  snapshots: RdapScanSnapshot[];
  isDark: boolean;
  onLoadAftermarket?: () => void;
}

interface YearBucket {
  year: string;
  yearNum: number;
  count: number;
  cumulative: number;
  domains: string[];
}

interface StatusSlice {
  key: 'available' | 'premium' | 'taken' | 'unknown';
  label: string;
  count: number;
  color: string;
}

export const RadarCharts: React.FC<RadarChartsProps> = ({
  snapshots,
  isDark,
  onLoadAftermarket
}) => {
  const [scope, setScope] = useState<'all' | 'latest'>('all');

  const regSvgRef = useRef<SVGSVGElement | null>(null);
  const regWrapRef = useRef<HTMLDivElement | null>(null);
  const donutSvgRef = useRef<SVGSVGElement | null>(null);
  const trendSvgRef = useRef<SVGSVGElement | null>(null);
  const trendWrapRef = useRef<HTMLDivElement | null>(null);
  const priceSvgRef = useRef<SVGSVGElement | null>(null);
  const priceWrapRef = useRef<HTMLDivElement | null>(null);

  const [regContainerWidth, setRegContainerWidth] = useState(560);
  const [trendContainerWidth, setTrendContainerWidth] = useState(560);
  const [priceContainerWidth, setPriceContainerWidth] = useState(560);

  const [hoveredYear, setHoveredYear] = useState<YearBucket | null>(null);
  const [hoveredSlice, setHoveredSlice] = useState<StatusSlice | null>(null);
  const [hoveredScan, setHoveredScan] = useState<RdapScanSnapshot | null>(null);

  const [selectedPremiumDomain, setSelectedPremiumDomain] = useState<string>('');
  const [priceTrend, setPriceTrend] = useState<PremiumPriceTrend | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [hoveredPricePoint, setHoveredPricePoint] = useState<PriceHistoryPoint | null>(null);

  const activeSnapshots = useMemo(() => {
    if (snapshots.length === 0) return [];
    return scope === 'latest' ? [snapshots[0]] : snapshots;
  }, [snapshots, scope]);

  // Deduplicate domains within the selected scope for distribution & registration timeline
  const uniqueDomains = useMemo<RdapDomainPoint[]>(() => {
    const map = new Map<string, RdapDomainPoint>();
    for (const snap of activeSnapshots) {
      for (const d of snap.domains) {
        if (!map.has(d.domain)) {
          map.set(d.domain, d);
        }
      }
    }
    return Array.from(map.values());
  }, [activeSnapshots]);

  const statusSlices = useMemo<StatusSlice[]>(() => {
    let available = 0;
    let premium = 0;
    let taken = 0;
    let unknown = 0;

    for (const d of uniqueDomains) {
      if (d.status === 'available' || d.status === 'hack') available += 1;
      else if (d.status === 'premium') premium += 1;
      else if (d.status === 'taken') taken += 1;
      else unknown += 1;
    }

    return [
      { key: 'available', label: 'Available', count: available, color: '#22c55e' },
      { key: 'premium', label: 'Aftermarket', count: premium, color: '#2596ff' },
      { key: 'taken', label: 'Taken', count: taken, color: '#ef4444' },
      { key: 'unknown', label: 'Unknown', count: unknown, color: '#71717a' }
    ];
  }, [uniqueDomains]);

  const yearBuckets = useMemo<YearBucket[]>(() => {
    const byYear = new Map<number, string[]>();
    for (const d of uniqueDomains) {
      if (d.registeredYear && d.registeredYear >= 1985 && d.registeredYear <= 2030) {
        const list = byYear.get(d.registeredYear) || [];
        list.push(d.domain);
        byYear.set(d.registeredYear, list);
      }
    }

    const sortedYears = Array.from(byYear.keys()).sort((a, b) => a - b);
    let running = 0;
    return sortedYears.map((yr) => {
      const doms = byYear.get(yr) || [];
      running += doms.length;
      return {
        year: String(yr),
        yearNum: yr,
        count: doms.length,
        cumulative: running,
        domains: doms
      };
    });
  }, [uniqueDomains]);

  const premiumDomains = useMemo<RdapDomainPoint[]>(() => {
    return uniqueDomains.filter((d) => d.status === 'premium');
  }, [uniqueDomains]);

  useEffect(() => {
    if (premiumDomains.length === 0) {
      setSelectedPremiumDomain('');
      setPriceTrend(null);
      return;
    }
    if (!premiumDomains.some((d) => d.domain === selectedPremiumDomain)) {
      setSelectedPremiumDomain(premiumDomains[0].domain);
    }
  }, [premiumDomains, selectedPremiumDomain]);

  useEffect(() => {
    const active = premiumDomains.find((d) => d.domain === selectedPremiumDomain);
    if (!active) return;

    let cancelled = false;
    setPriceLoading(true);
    setPriceError(null);
    setHoveredPricePoint(null);

    fetchPremiumPriceHistory(active.domain, active.price)
      .then((res) => {
        if (!cancelled) {
          setPriceTrend(res);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPriceError(err instanceof Error ? err.message : 'Unable to fetch price trend.');
        }
      })
      .finally(() => {
        if (!cancelled) setPriceLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPremiumDomain, premiumDomains]);

  // Responsive container measurement via ResizeObserver
  useEffect(() => {
    const observers: ResizeObserver[] = [];
    if (regWrapRef.current) {
      const obs = new ResizeObserver((entries) => {
        const w = entries[0]?.contentRect?.width;
        if (w && w > 120) setRegContainerWidth(Math.floor(w));
      });
      obs.observe(regWrapRef.current);
      observers.push(obs);
    }
    if (trendWrapRef.current) {
      const obs = new ResizeObserver((entries) => {
        const w = entries[0]?.contentRect?.width;
        if (w && w > 120) setTrendContainerWidth(Math.floor(w));
      });
      obs.observe(trendWrapRef.current);
      observers.push(obs);
    }
    if (priceWrapRef.current) {
      const obs = new ResizeObserver((entries) => {
        const w = entries[0]?.contentRect?.width;
        if (w && w > 120) setPriceContainerWidth(Math.floor(w));
      });
      obs.observe(priceWrapRef.current);
      observers.push(obs);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, [premiumDomains.length]);

  // 1. D3 Historical Domain Registration Timeline (Bar + Cumulative Curve)
  useEffect(() => {
    const svgEl = regSvgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width = Math.max(280, regContainerWidth);
    const height = 230;
    const margin = { top: 18, right: 20, bottom: 34, left: 36 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

    if (yearBuckets.length === 0) return;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const axisColor = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.14)';
    const textColor = isDark ? '#a1a1aa' : '#64748b';

    const x = d3
      .scaleBand<string>()
      .domain(yearBuckets.map((d) => d.year))
      .range([0, innerW])
      .padding(0.28);

    const maxCount = d3.max(yearBuckets, (d) => d.count) || 1;
    const y = d3.scaleLinear().domain([0, Math.max(2, maxCount)]).nice().range([innerH, 0]);

    const maxCum = d3.max(yearBuckets, (d) => d.cumulative) || 1;
    const yCum = d3.scaleLinear().domain([0, maxCum]).range([innerH, 0]);

    // Horizontal gridlines
    g.append('g')
      .call(
        d3
          .axisLeft(y)
          .ticks(Math.min(5, maxCount + 1))
          .tickSize(-innerW)
          .tickFormat(() => '')
      )
      .call((grid) => grid.select('.domain').remove())
      .call((grid) =>
        grid
          .selectAll('line')
          .attr('stroke', axisColor)
          .attr('stroke-dasharray', '3,3')
      );

    // X axis (downsample ticks if many years)
    const tickValues =
      yearBuckets.length > 10
        ? yearBuckets.filter((_, i) => i % Math.ceil(yearBuckets.length / 8) === 0 || i === yearBuckets.length - 1).map((d) => d.year)
        : yearBuckets.map((d) => d.year);

    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickValues(tickValues))
      .call((ax) => ax.select('.domain').attr('stroke', axisColor))
      .call((ax) => ax.selectAll('line').attr('stroke', axisColor))
      .call((ax) =>
        ax
          .selectAll('text')
          .attr('fill', textColor)
          .style('font-size', '11px')
          .style('font-family', 'JetBrains Mono, monospace')
      );

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(Math.min(5, maxCount + 1)).tickFormat(d3.format('d')))
      .call((ax) => ax.select('.domain').remove())
      .call((ax) => ax.selectAll('line').remove())
      .call((ax) =>
        ax
          .selectAll('text')
          .attr('fill', textColor)
          .style('font-size', '11px')
          .style('font-family', 'JetBrains Mono, monospace')
      );

    // Bars
    g.selectAll('rect.reg-bar')
      .data(yearBuckets)
      .join('rect')
      .attr('class', 'reg-bar')
      .attr('x', (d) => x(d.year) ?? 0)
      .attr('width', x.bandwidth())
      .attr('rx', 4)
      .attr('y', innerH)
      .attr('height', 0)
      .attr('fill', '#10b981')
      .attr('opacity', 0.85)
      .style('cursor', 'pointer')
      .on('mouseenter', (_ev, d) => setHoveredYear(d))
      .on('mouseleave', () => setHoveredYear(null))
      .transition()
      .duration(420)
      .attr('y', (d) => y(d.count))
      .attr('height', (d) => Math.max(2, innerH - y(d.count)));

    // Cumulative Trend Curve
    if (yearBuckets.length > 1) {
      const lineGen = d3
        .line<YearBucket>()
        .x((d) => (x(d.year) ?? 0) + x.bandwidth() / 2)
        .y((d) => yCum(d.cumulative))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(yearBuckets)
        .attr('fill', 'none')
        .attr('stroke', '#38bdf8')
        .attr('stroke-width', 2)
        .attr('d', lineGen);

      g.selectAll('circle.cum-dot')
        .data(yearBuckets)
        .join('circle')
        .attr('class', 'cum-dot')
        .attr('cx', (d) => (x(d.year) ?? 0) + x.bandwidth() / 2)
        .attr('cy', (d) => yCum(d.cumulative))
        .attr('r', 3.5)
        .attr('fill', '#38bdf8')
        .attr('stroke', isDark ? '#111114' : '#ffffff')
        .attr('stroke-width', 1.5)
        .style('pointer-events', 'none');
    }
  }, [yearBuckets, regContainerWidth, isDark]);

  // 2. D3 Availability Distribution Donut Chart
  useEffect(() => {
    const svgEl = donutSvgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const size = 210;
    const radius = size / 2;
    const innerR = radius * 0.62;
    const outerR = radius * 0.9;

    svg.attr('viewBox', `0 0 ${size} ${size}`).attr('width', size).attr('height', size);

    const nonZero = statusSlices.filter((s) => s.count > 0);
    const total = d3.sum(nonZero, (d) => d.count);

    const g = svg.append('g').attr('transform', `translate(${radius},${radius})`);

    if (total === 0) {
      g.append('circle')
        .attr('r', (innerR + outerR) / 2)
        .attr('fill', 'none')
        .attr('stroke', isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.1)')
        .attr('stroke-width', outerR - innerR);
      return;
    }

    const pie = d3
      .pie<StatusSlice>()
      .value((d) => d.count)
      .sort(null)
      .padAngle(0.03);

    const arc = d3
      .arc<d3.PieArcDatum<StatusSlice>>()
      .innerRadius(innerR)
      .outerRadius(outerR)
      .cornerRadius(4);

    const hoverArc = d3
      .arc<d3.PieArcDatum<StatusSlice>>()
      .innerRadius(innerR)
      .outerRadius(outerR + 5)
      .cornerRadius(4);

    g.selectAll<SVGPathElement, d3.PieArcDatum<StatusSlice>>('path.slice')
      .data(pie(nonZero))
      .join('path')
      .attr('class', 'slice')
      .attr('d', (d) => arc(d) || '')
      .attr('fill', (d) => d.data.color)
      .style('cursor', 'pointer')
      .on('mouseenter', function (_ev, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('d', hoverArc(d) || '');
        setHoveredSlice(d.data);
      })
      .on('mouseleave', function (_ev, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('d', arc(d) || '');
        setHoveredSlice(null);
      });

    const availSlice = statusSlices.find((s) => s.key === 'available');
    const centerPct = hoveredSlice
      ? Math.round((hoveredSlice.count / total) * 100)
      : Math.round(((availSlice?.count || 0) / total) * 100);
    const centerTitle = hoveredSlice ? hoveredSlice.label : 'Available';

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.1em')
      .attr('fill', isDark ? '#ffffff' : '#0f172a')
      .style('font-size', '24px')
      .style('font-weight', '700')
      .style('font-family', 'Plus Jakarta Sans, sans-serif')
      .text(`${centerPct}%`);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.4em')
      .attr('fill', isDark ? '#a1a1aa' : '#64748b')
      .style('font-size', '11px')
      .text(centerTitle);
  }, [statusSlices, hoveredSlice, isDark]);

  // 3. D3 Search History Availability Trend (Area + Line over recent scans)
  const chronologicalScans = useMemo(() => {
    return [...snapshots].slice(0, 12).reverse();
  }, [snapshots]);

  useEffect(() => {
    const svgEl = trendSvgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width = Math.max(280, trendContainerWidth);
    const height = 190;
    const margin = { top: 16, right: 18, bottom: 32, left: 34 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

    if (chronologicalScans.length === 0) return;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const axisColor = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.14)';
    const textColor = isDark ? '#a1a1aa' : '#64748b';

    const x = d3
      .scalePoint<number>()
      .domain(chronologicalScans.map((_s, idx) => idx))
      .range([0, innerW])
      .padding(0.35);

    const maxVal = d3.max(chronologicalScans, (d) => Math.max(d.available, d.taken)) || 1;
    const y = d3.scaleLinear().domain([0, Math.max(2, maxVal)]).nice().range([innerH, 0]);

    g.append('g')
      .call(
        d3
          .axisLeft(y)
          .ticks(4)
          .tickSize(-innerW)
          .tickFormat(() => '')
      )
      .call((grid) => grid.select('.domain').remove())
      .call((grid) => grid.selectAll('line').attr('stroke', axisColor).attr('stroke-dasharray', '3,3'));

    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(
        d3.axisBottom(x).tickFormat((idx) => {
          const item = chronologicalScans[Number(idx)];
          if (!item) return '';
          return item.query.length > 9 ? `${item.query.slice(0, 8)}…` : item.query;
        })
      )
      .call((ax) => ax.select('.domain').attr('stroke', axisColor))
      .call((ax) => ax.selectAll('line').attr('stroke', axisColor))
      .call((ax) =>
        ax
          .selectAll('text')
          .attr('fill', textColor)
          .style('font-size', '10px')
          .style('font-family', 'JetBrains Mono, monospace')
      );

    g.append('g')
      .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('d')))
      .call((ax) => ax.select('.domain').remove())
      .call((ax) => ax.selectAll('line').remove())
      .call((ax) =>
        ax
          .selectAll('text')
          .attr('fill', textColor)
          .style('font-size', '11px')
          .style('font-family', 'JetBrains Mono, monospace')
      );

    const availArea = d3
      .area<RdapScanSnapshot>()
      .x((_d, i) => x(i) ?? 0)
      .y0(innerH)
      .y1((d) => y(d.available))
      .curve(d3.curveMonotoneX);

    const availLine = d3
      .line<RdapScanSnapshot>()
      .x((_d, i) => x(i) ?? 0)
      .y((d) => y(d.available))
      .curve(d3.curveMonotoneX);

    const takenLine = d3
      .line<RdapScanSnapshot>()
      .x((_d, i) => x(i) ?? 0)
      .y((d) => y(d.taken))
      .curve(d3.curveMonotoneX);

    if (chronologicalScans.length > 1) {
      g.append('path')
        .datum(chronologicalScans)
        .attr('fill', 'rgba(34, 197, 94, 0.14)')
        .attr('d', availArea);

      g.append('path')
        .datum(chronologicalScans)
        .attr('fill', 'none')
        .attr('stroke', '#22c55e')
        .attr('stroke-width', 2)
        .attr('d', availLine);

      g.append('path')
        .datum(chronologicalScans)
        .attr('fill', 'none')
        .attr('stroke', '#ef4444')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,3')
        .attr('d', takenLine);
    }

    // Points for interactive hover
    g.selectAll('circle.avail-pt')
      .data(chronologicalScans)
      .join('circle')
      .attr('cx', (_d, i) => x(i) ?? 0)
      .attr('cy', (d) => y(d.available))
      .attr('r', 4)
      .attr('fill', '#22c55e')
      .attr('stroke', isDark ? '#111114' : '#ffffff')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mouseenter', (_ev, d) => setHoveredScan(d))
      .on('mouseleave', () => setHoveredScan(null));

    g.selectAll('circle.taken-pt')
      .data(chronologicalScans)
      .join('circle')
      .attr('cx', (_d, i) => x(i) ?? 0)
      .attr('cy', (d) => y(d.taken))
      .attr('r', 4)
      .attr('fill', '#ef4444')
      .attr('stroke', isDark ? '#111114' : '#ffffff')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mouseenter', (_ev, d) => setHoveredScan(d))
      .on('mouseleave', () => setHoveredScan(null));
  }, [chronologicalScans, trendContainerWidth, isDark]);

  // 4. D3 Premium / Aftermarket Domain Price Trend Line Chart
  useEffect(() => {
    const svgEl = priceSvgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const series = priceTrend?.history || [];
    const width = Math.max(280, priceContainerWidth);
    const height = 210;
    const margin = { top: 18, right: 20, bottom: 32, left: 60 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

    if (series.length === 0) return;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const axisColor = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.14)';
    const textColor = isDark ? '#a1a1aa' : '#64748b';

    const x = d3
      .scalePoint<string>()
      .domain(series.map((d) => d.month))
      .range([0, innerW])
      .padding(0.25);

    const minVal = d3.min(series, (d) => d.priceUsd) || 0;
    const maxVal = d3.max(series, (d) => d.priceUsd) || 1000;
    const pad = Math.max(100, (maxVal - minVal) * 0.18);

    const y = d3
      .scaleLinear()
      .domain([Math.max(0, minVal - pad), maxVal + pad])
      .nice()
      .range([innerH, 0]);

    // Gridlines
    g.append('g')
      .call(
        d3
          .axisLeft(y)
          .ticks(4)
          .tickSize(-innerW)
          .tickFormat(() => '')
      )
      .call((grid) => grid.select('.domain').remove())
      .call((grid) => grid.selectAll('line').attr('stroke', axisColor).attr('stroke-dasharray', '3,3'));

    // X axis (every other month on narrow viewports)
    const tickMonths =
      width < 520
        ? series.filter((_, idx) => idx % 2 === 0 || idx === series.length - 1).map((d) => d.month)
        : series.map((d) => d.month);

    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(x)
          .tickValues(tickMonths)
          .tickFormat((m) => String(m).split(' ')[0])
      )
      .call((ax) => ax.select('.domain').attr('stroke', axisColor))
      .call((ax) => ax.selectAll('line').attr('stroke', axisColor))
      .call((ax) =>
        ax
          .selectAll('text')
          .attr('fill', textColor)
          .style('font-size', '11px')
          .style('font-family', 'JetBrains Mono, monospace')
      );

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(4).tickFormat((val) => d3.format('$,.0f')(Number(val))))
      .call((ax) => ax.select('.domain').remove())
      .call((ax) => ax.selectAll('line').remove())
      .call((ax) =>
        ax
          .selectAll('text')
          .attr('fill', textColor)
          .style('font-size', '11px')
          .style('font-family', 'JetBrains Mono, monospace')
      );

    const areaGen = d3
      .area<PriceHistoryPoint>()
      .x((d) => x(d.month) ?? 0)
      .y0(innerH)
      .y1((d) => y(d.priceUsd))
      .curve(d3.curveMonotoneX);

    const lineGen = d3
      .line<PriceHistoryPoint>()
      .x((d) => x(d.month) ?? 0)
      .y((d) => y(d.priceUsd))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(series)
      .attr('fill', 'rgba(37, 150, 255, 0.14)')
      .attr('d', areaGen);

    const pathNode = g
      .append('path')
      .datum(series)
      .attr('fill', 'none')
      .attr('stroke', '#2596ff')
      .attr('stroke-width', 2.5)
      .attr('d', lineGen);

    const totalLen = pathNode.node()?.getTotalLength() || 0;
    if (totalLen > 0) {
      pathNode
        .attr('stroke-dasharray', `${totalLen} ${totalLen}`)
        .attr('stroke-dashoffset', totalLen)
        .transition()
        .duration(480)
        .attr('stroke-dashoffset', 0);
    }

    g.selectAll<SVGCircleElement, PriceHistoryPoint>('circle.price-pt')
      .data(series)
      .join('circle')
      .attr('class', 'price-pt')
      .attr('cx', (d) => x(d.month) ?? 0)
      .attr('cy', (d) => y(d.priceUsd))
      .attr('r', 4)
      .attr('fill', '#2596ff')
      .attr('stroke', isDark ? '#111114' : '#ffffff')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mouseenter', function (_ev, d) {
        d3.select(this).transition().duration(120).attr('r', 6);
        setHoveredPricePoint(d);
      })
      .on('mouseleave', function () {
        d3.select(this).transition().duration(120).attr('r', 4);
        setHoveredPricePoint(null);
      });
  }, [priceTrend, priceContainerWidth, isDark]);

  const totalUnique = uniqueDomains.length;

  return (
    <div className="space-y-6">
      {/* Scope Switcher & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            RDAP Telemetry &amp; Registration Analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Powered by D3.js across {snapshots.length} recorded RDAP {snapshots.length === 1 ? 'scan' : 'scans'} ({totalUnique} unique domains)
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-black/60 border border-slate-200 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              scope === 'all'
                ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All RDAP History ({snapshots.length})
          </button>
          <button
            type="button"
            onClick={() => setScope('latest')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              scope === 'latest'
                ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Latest Scan
          </button>
        </div>
      </div>

      {/* Top Row: Registration Year Histogram + Availability Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 rounded-2xl bg-slate-50 dark:bg-black/45 border border-slate-200 dark:border-white/[0.07] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Historical Domain Registration Timeline
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Original RDAP registration years &amp; cumulative growth across taken domains
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" />
                Year Count
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#38bdf8]" />
                Cumulative
              </span>
            </div>
          </div>

          <div ref={regWrapRef} className="w-full min-h-[230px] relative">
            {yearBuckets.length === 0 ? (
              <div className="h-[230px] flex items-center justify-center text-center px-4 text-xs text-slate-500 dark:text-zinc-400">
                {uniqueDomains.some((d) => d.status === 'taken')
                  ? 'Registries for the scanned taken domains did not expose RDAP registration timestamps.'
                  : 'Scan a brand with registered domains to plot live RDAP registration years.'}
              </div>
            ) : (
              <svg ref={regSvgRef} className="overflow-visible" aria-label="Historical domain registration timeline chart" />
            )}
          </div>

          <div className="mt-2 min-h-[22px] text-xs text-slate-600 dark:text-zinc-400">
            {hoveredYear ? (
              <span>
                <strong className="text-slate-900 dark:text-white">{hoveredYear.year}:</strong>{' '}
                {hoveredYear.count} {hoveredYear.count === 1 ? 'domain' : 'domains'} registered (
                {hoveredYear.domains.slice(0, 4).join(', ')}
                {hoveredYear.domains.length > 4 ? ` +${hoveredYear.domains.length - 4} more` : ''})
              </span>
            ) : (
              <span>Hover any year bar to inspect domains registered in that year.</span>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl bg-slate-50 dark:bg-black/45 border border-slate-200 dark:border-white/[0.07] p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Availability Distribution
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Share of checked domains by live registry state
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center justify-center gap-5 my-3">
            <svg ref={donutSvgRef} aria-label="Availability distribution donut chart" />

            <div className="space-y-2 w-full sm:w-auto">
              {statusSlices.map((s) => (
                <div key={s.key} className="flex items-center justify-between gap-4 text-xs">
                  <span className="inline-flex items-center gap-2 text-slate-600 dark:text-zinc-300">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span>{s.label}</span>
                  </span>
                  <span className="font-mono-tech font-semibold text-slate-900 dark:text-white tabular-nums">
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-zinc-400">
            {hoveredSlice
              ? `${hoveredSlice.label}: ${hoveredSlice.count} of ${totalUnique} scanned domains`
              : 'Hover ring segments to inspect individual status totals.'}
          </div>
        </div>
      </div>

      {/* Bottom Row: Sequential RDAP Scan History Trend */}
      <div className="rounded-2xl bg-slate-50 dark:bg-black/45 border border-slate-200 dark:border-white/[0.07] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              RDAP Search History Comparison
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Available vs. taken domain counts across your recent RDAP lookups
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
              Available
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
              Taken
            </span>
          </div>
        </div>

        <div ref={trendWrapRef} className="w-full min-h-[190px]">
          {chronologicalScans.length === 0 ? (
            <div className="h-[190px] flex items-center justify-center text-xs text-slate-500 dark:text-zinc-400">
              Run a search above to start recording RDAP comparison telemetry.
            </div>
          ) : (
            <svg ref={trendSvgRef} className="overflow-visible" aria-label="RDAP search history trend chart" />
          )}
        </div>

        <div className="mt-2 min-h-[20px] text-xs text-slate-600 dark:text-zinc-400">
          {hoveredScan ? (
            <span>
              Query <strong className="text-slate-900 dark:text-white">&ldquo;{hoveredScan.query}&rdquo;</strong> ({hoveredScan.mode}):{' '}
              {hoveredScan.available} available, {hoveredScan.taken} taken, {hoveredScan.premium} aftermarket
            </span>
          ) : (
            <span>Hover data points to compare available vs. registered ratios by query.</span>
          )}
        </div>
      </div>

      {/* Price Trend D3 Line Chart for Premium / Aftermarket Domains */}
      <div className="rounded-2xl bg-slate-50 dark:bg-black/45 border border-slate-200 dark:border-white/[0.07] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Aftermarket &amp; Premium Price Trend
              </h3>
              {priceTrend && (
                <span
                  className={`text-[11px] font-mono-tech font-semibold px-2 py-0.5 rounded-md ${
                    priceTrend.changePct >= 0
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/15 text-rose-500'
                  }`}
                >
                  {priceTrend.changePct >= 0 ? '+' : ''}
                  {priceTrend.changePct}% (12m)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Historical 12-month valuation curve for checked domains listed as premium or aftermarket
            </p>
          </div>

          {premiumDomains.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {premiumDomains.slice(0, 6).map((pd) => {
                const active = pd.domain === selectedPremiumDomain;
                return (
                  <button
                    key={pd.domain}
                    type="button"
                    onClick={() => setSelectedPremiumDomain(pd.domain)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono-tech border transition-colors ${
                      active
                        ? 'bg-[#2596ff] border-[#2596ff] text-white font-semibold'
                        : 'bg-white dark:bg-[#16161a] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-zinc-300 hover:border-[#2596ff]/60'
                    }`}
                  >
                    {pd.domain}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div ref={priceWrapRef} className="w-full min-h-[210px]">
          {premiumDomains.length === 0 ? (
            <div className="h-[210px] flex flex-col items-center justify-center text-center px-4 gap-3">
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md">
                No domains in your current scope are listed as premium or aftermarket yet. Check aftermarket listings to inspect 12-month valuation trends.
              </p>
              {onLoadAftermarket && (
                <button
                  type="button"
                  onClick={onLoadAftermarket}
                  className="px-4 py-2 rounded-xl bg-[#2596ff] hover:bg-sky-500 text-xs font-semibold text-white transition-colors"
                >
                  Check Aftermarket Domains
                </button>
              )}
            </div>
          ) : priceLoading ? (
            <div className="h-[210px] flex items-center justify-center text-xs text-slate-500 dark:text-zinc-400">
              Loading price history for {selectedPremiumDomain}...
            </div>
          ) : priceError ? (
            <div className="h-[210px] flex items-center justify-center text-xs text-rose-500">
              {priceError}
            </div>
          ) : (
            <svg
              ref={priceSvgRef}
              className="overflow-visible"
              aria-label="Premium domain aftermarket price trend chart"
            />
          )}
        </div>

        {premiumDomains.length > 0 && priceTrend && (
          <div className="mt-2 min-h-[20px] flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-zinc-400">
            <div>
              {hoveredPricePoint ? (
                <span>
                  <strong className="text-slate-900 dark:text-white">{hoveredPricePoint.month}:</strong>{' '}
                  Estimated valuation{' '}
                  <strong className="text-[#2596ff]">
                    ${hoveredPricePoint.priceUsd.toLocaleString()}
                  </strong>
                </span>
              ) : (
                <span>Hover data points along the curve to inspect monthly valuation estimates.</span>
              )}
            </div>
            <div className="font-mono-tech text-slate-700 dark:text-zinc-300">
              Current Listing: <strong className="text-slate-900 dark:text-white">${priceTrend.currentPriceUsd.toLocaleString()}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
