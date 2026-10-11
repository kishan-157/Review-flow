import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  Users,
  Eye,
  Star,
  CheckCircle2,
  RefreshCw,
  BarChart3,
  LineChart as LineChartIcon,
  Sparkles,
} from 'lucide-react';
import { getDailyReviewAccessTrend, DailyAccessTrendPoint } from '../lib/db';

interface DailyReviewAccessTrendProps {
  businessId: string;
  businessName?: string;
}

export const DailyReviewAccessTrend: React.FC<DailyReviewAccessTrendProps> = ({
  businessId,
  businessName,
}) => {
  const [daysRange, setDaysRange] = useState<7 | 14 | 30>(14);
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [data, setData] = useState<DailyAccessTrendPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadTrendData = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const points = await getDailyReviewAccessTrend(businessId, daysRange);
      setData(points);
    } catch (err) {
      console.error('Failed to load daily trend data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrendData();
  }, [businessId, daysRange]);

  // Aggregate Metrics
  const totalAccesses = data.reduce((acc, curr) => acc + curr.pageAccesses, 0);
  const totalRatings = data.reduce((acc, curr) => acc + curr.ratingsSubmitted, 0);
  const totalGoogleClicks = data.reduce((acc, curr) => acc + curr.googleClicks, 0);
  const total5Stars = data.reduce((acc, curr) => acc + curr.fiveStars, 0);
  const avgDaily = data.length > 0 ? Math.round(totalAccesses / data.length) : 0;
  
  // Find peak day
  const peakDay = data.reduce((max, curr) => (curr.pageAccesses > (max?.pageAccesses || 0) ? curr : max), data[0]);

  // Overall Conversion rate
  const overallConversion = totalAccesses > 0 ? Math.round((totalGoogleClicks / totalAccesses) * 100) : 0;

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload as DailyAccessTrendPoint;
      return (
        <div className="bg-neutral-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-xl border border-neutral-700/60 text-xs space-y-2 min-w-[200px]">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
            <span className="font-bold text-neutral-200">
              {point.dayName}, {point.shortDate}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {point.conversionRate}% Conv
            </span>
          </div>

          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-neutral-400">
                <span className="w-2.5 h-2.5 rounded-full bg-[#6C3BFF]" />
                Review Page Accesses:
              </span>
              <span className="font-bold font-mono text-white text-sm">
                {point.pageAccesses}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-neutral-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                Ratings Given:
              </span>
              <span className="font-mono text-amber-300 font-semibold">
                {point.ratingsSubmitted}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-neutral-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                Google Clicks:
              </span>
              <span className="font-mono text-emerald-300 font-semibold">
                {point.googleClicks}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80 text-[11px]">
              <span className="text-neutral-400">5-Star Taps:</span>
              <span className="text-amber-400 font-semibold">
                {point.fiveStars} ({point.ratingsSubmitted > 0 ? Math.round((point.fiveStars / point.ratingsSubmitted) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#6C3BFF] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                Daily Review Landing Page Access Trend
              </h3>
              <p className="text-xs text-neutral-500">
                Live daily tracking of customers tapping NFC or scanning QR standees to view your review page
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Chart Type Toggle */}
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-xl border border-neutral-200/60">
            <button
              type="button"
              onClick={() => setChartType('area')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                chartType === 'area'
                  ? 'bg-white text-[#6C3BFF] shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
              title="Area Trend View"
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Trend</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                chartType === 'bar'
                  ? 'bg-white text-[#6C3BFF] shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
              title="Bar Chart Breakdown"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bar</span>
            </button>
          </div>

          {/* Days Range Toggle */}
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-xl border border-neutral-200/60">
            {([7, 14, 30] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDaysRange(r)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  daysRange === r
                    ? 'bg-[#6C3BFF] text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {r}D
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadTrendData}
            disabled={loading}
            className="p-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 border border-neutral-200/60 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-[11px] font-medium">
            <span>Total Accesses ({daysRange}D)</span>
            <Eye className="w-3.5 h-3.5 text-[#6C3BFF]" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900">
            {totalAccesses}
          </div>
          <span className="text-[10px] text-purple-700 font-semibold block">
            Review page visits
          </span>
        </div>

        <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-[11px] font-medium">
            <span>Daily Average</span>
            <Users className="w-3.5 h-3.5 text-neutral-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900">
            {avgDaily}
          </div>
          <span className="text-[10px] text-neutral-500 font-medium block">
            Visitors / day
          </span>
        </div>

        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-100 space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-[11px] font-medium">
            <span>Peak Day Traffic</span>
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900">
            {peakDay?.pageAccesses || 0}
          </div>
          <span className="text-[10px] text-amber-700 font-semibold block truncate">
            {peakDay ? `${peakDay.dayName}, ${peakDay.shortDate}` : '—'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-[11px] font-medium">
            <span>Google Review Conv.</span>
            <Star className="w-3.5 h-3.5 text-emerald-600 fill-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-900">
            {overallConversion}%
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold block">
            {totalGoogleClicks} converted to Google
          </span>
        </div>
      </div>

      {/* Main Recharts Visualization */}
      <div className="w-full h-72 sm:h-80 pt-2">
        {loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-xs text-neutral-400 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#6C3BFF]" />
            <span>Updating daily access trends...</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  {/* Purple Gradient for Page Accesses */}
                  <linearGradient id="accessGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6C3BFF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6C3BFF" stopOpacity={0.0} />
                  </linearGradient>
                  {/* Emerald Gradient for Google Redirects */}
                  <linearGradient id="googleGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="shortDate"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', paddingBottom: '12px' }}
                />

                <Area
                  type="monotone"
                  name="Review Page Accesses (Scans)"
                  dataKey="pageAccesses"
                  stroke="#6C3BFF"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#accessGradient)"
                  activeDot={{ r: 6, fill: '#6C3BFF', stroke: '#fff', strokeWidth: 2 }}
                />

                <Area
                  type="monotone"
                  name="Google Review Clicks"
                  dataKey="googleClicks"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#googleGradient)"
                  activeDot={{ r: 5, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            ) : (
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="shortDate"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={36}
                  iconType="square"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', paddingBottom: '12px' }}
                />
                <Bar
                  name="Review Page Accesses"
                  dataKey="pageAccesses"
                  fill="#6C3BFF"
                  radius={[4, 4, 0, 0]}
                  barSize={16}
                />
                <Bar
                  name="5-Star Ratings"
                  dataKey="fiveStars"
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                  barSize={16}
                />
                <Bar
                  name="Google Clicks"
                  dataKey="googleClicks"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                  barSize={16}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer Info & Insights */}
      <div className="pt-2 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-neutral-500 gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#6C3BFF]" />
          <span>
            Every physical NFC tap or tabletop QR code scan increments this daily access log in real-time.
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono font-medium text-neutral-600">
          <span className="flex items-center gap-1 text-emerald-600">
            <CheckCircle2 className="w-3 h-3" />
            100% Policy Compliant
          </span>
          <span>·</span>
          <span>Filtered by Unique Visitors</span>
        </div>
      </div>
    </div>
  );
};
