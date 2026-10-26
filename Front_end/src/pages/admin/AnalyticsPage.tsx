import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Typography, Skeleton } from 'antd';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, Users, DollarSign, Bed, Activity, 
  ArrowUpRight, PieChart as PieIcon, Download 
} from 'lucide-react';
import { adminApi, DashboardAnalyticsDto } from '../../services/adminApi';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const COLORS = [
  '#C6A96B', // Luxury Gold
  '#10B981', // Emerald (Bright Green)
  '#F59E0B', // Amber (Bright Orange)
  '#F43F5E', // Rose (Bright Red)
  '#6366F1', // Indigo (Bright Blue/Purple)
  '#8B5CF6', // Violet (Bright Purple)
  '#06B6D4', // Cyan
  '#94A3B8'  // Slate
];

const AnalyticsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<DashboardAnalyticsDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await adminApi.getDashboardAnalytics();
        setData(result);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const STATUS_MAP: Record<string, string> = {
    'Pending': 'Chờ xác nhận',
    'Confirmed': 'Đã xác nhận',
    'CheckedIn': 'Đã nhận phòng',
    'CheckedOut': 'Đã trả phòng',
    'Cancelled': 'Đã hủy'
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
  };

  const handleExportCSV = () => {
    if (!data) return;

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "Ngay,Doanh Thu (VND)\n";
    data.revenueChart30Days.forEach(item => {
      csvContent += `${item.date},${item.revenue}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `DoanhThu_30Ngay_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton active paragraph={{ rows: 2 }} />
        <Row gutter={[24, 24]}>
          {[1, 2, 3, 4].map(i => (
            <Col key={i} xs={24} sm={12} lg={6}><Skeleton.Button active block style={{ height: 120, borderRadius: 16 }} /></Col>
          ))}
        </Row>
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-[var(--bg-main)] min-h-screen">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div className="flex flex-col gap-2">
          <Typography.Title level={2} className="!m-0 font-display font-bold text-title tracking-tight">
            {t('analytics.title')}
          </Typography.Title>
          <Typography.Paragraph className="text-muted text-base max-w-2xl !mb-0">
            {t('analytics.subtitle')}
          </Typography.Paragraph>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 bg-primary hover:bg-gold-light text-white px-6 py-3 rounded-xl font-bold transition-all shadow-xl shadow-primary/20 active:scale-95"
        >
          <Download size={18} /> {t('analytics.export')}
        </button>
      </motion.div>

      {/* Top Stats */}
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glass-card border border-luxury/10 shadow-sm hover:shadow-xl transition-all duration-500 rounded-2xl group overflow-hidden relative">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
              <Statistic
                title={<span className="flex items-center gap-2 text-muted font-bold uppercase tracking-widest text-[10px] mb-2"><DollarSign size={14} className="text-primary" /> {t('analytics.total_revenue')}</span>}
                value={data?.totalRevenue}
                formatter={(val) => formatCurrency(Number(val))}
                valueStyle={{ color: '#C6A96B', fontWeight: 900, fontSize: '1.75rem', letterSpacing: '-0.03em' }}
              />
              <div className="mt-4 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-tighter text-green-600 bg-green-500/10 w-fit px-3 py-1 rounded-full">
                <ArrowUpRight size={14} strokeWidth={3} /> <span>12.5% {t('analytics.growth')}</span>
              </div>
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="glass-card border border-luxury/10 shadow-sm hover:shadow-xl transition-all duration-500 rounded-2xl group overflow-hidden relative">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
              <Statistic
                title={<span className="flex items-center gap-2 text-muted font-bold uppercase tracking-widest text-[10px] mb-2"><Users size={14} className="text-indigo-500" /> {t('analytics.occupancy_rate')}</span>}
                value={data?.occupancyRate}
                suffix="%"
                valueStyle={{ color: '#3730A3', fontWeight: 900, fontSize: '1.75rem', letterSpacing: '-0.03em' }}
              />
              <div className="mt-4 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-tighter text-indigo-600 bg-indigo-500/10 w-fit px-3 py-1 rounded-full">
                <Activity size={14} strokeWidth={3} /> <span>{t('analytics.stable_ops')}</span>
              </div>
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="glass-card border border-luxury/10 shadow-sm hover:shadow-xl transition-all duration-500 rounded-2xl group overflow-hidden relative">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
              <Statistic
                title={<span className="flex items-center gap-2 text-muted font-bold uppercase tracking-widest text-[10px] mb-2"><TrendingUp size={14} className="text-emerald-500" /> {t('analytics.adr')}</span>}
                value={data?.adr}
                formatter={(val) => formatCurrency(Number(val))}
                valueStyle={{ color: '#059669', fontWeight: 900, fontSize: '1.75rem', letterSpacing: '-0.03em' }}
              />
              <div className="mt-4 text-[10px] text-muted font-bold uppercase tracking-widest">{t('analytics.avg_price_night')}</div>
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="glass-card border border-luxury/10 shadow-sm hover:shadow-xl transition-all duration-500 rounded-2xl group overflow-hidden relative">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors" />
              <Statistic
                title={<span className="flex items-center gap-2 text-muted font-bold uppercase tracking-widest text-[10px] mb-2"><Bed size={14} className="text-amber-500" /> {t('analytics.revpar')}</span>}
                value={data?.revPAR}
                formatter={(val) => formatCurrency(Number(val))}
                valueStyle={{ color: '#D97706', fontWeight: 900, fontSize: '1.75rem', letterSpacing: '-0.03em' }}
              />
              <div className="mt-4 text-[10px] text-muted font-bold uppercase tracking-widest">{t('analytics.rev_empty_room')}</div>
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* Main Charts Row */}
      <Row gutter={[24, 24]}>
        <Col span={24} lg={16}>
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>
            <Card 
              title={<span className="text-xs font-black uppercase tracking-[0.2em] text-title">{t('analytics.revenue_30days')}</span>} 
              className="glass-card border border-luxury/10 shadow-xl rounded-2xl overflow-hidden"
            >
            <div style={{ width: '100%', height: 350, marginTop: 20 }}>
              <ResponsiveContainer>
                <AreaChart data={data?.revenueChart30Days} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C6A96B" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#C6A96B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(val) => `${val/1000000}M`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid rgba(198,169,107,0.2)', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', padding: '12px' }}
                    itemStyle={{ color: '#C6A96B' }}
                    formatter={(value: number) => [formatCurrency(value), 'Doanh thu']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#C6A96B" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            </Card>
          </motion.div>
        </Col>

        <Col span={24} lg={8}>
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }}>
            <Card 
              title={<span className="text-xs font-black uppercase tracking-[0.2em] text-title">{t('analytics.rev_by_room_type')}</span>} 
              className="glass-card border border-luxury/10 shadow-xl rounded-2xl h-full"
            >
            <div style={{ width: '100%', height: 420, marginTop: 20 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={data?.revenueByRoomType}
                    cx="50%"
                    cy="44%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {data?.revenueByRoomType.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid rgba(198,169,107,0.2)' }}
                    formatter={(value: number) => formatCurrency(value)} 
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    align="center"
                    iconType="circle" 
                    iconSize={10}
                    formatter={(value) => <span style={{ color: '#94a3b8', marginLeft: '8px' }}>{value}</span>}
                    wrapperStyle={{ 
                      paddingTop: '32px',
                      fontSize: '12px',
                      fontWeight: 500
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>
      </Col>
    </Row>

      {/* Bottom Charts Row */}
      <Row gutter={[24, 24]}>
        <Col span={24} lg={12}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <Card 
              title={<span className="text-xs font-black uppercase tracking-[0.2em] text-title">{t('analytics.booking_status_dist')}</span>} 
              className="glass-card border border-luxury/10 shadow-xl rounded-2xl"
            >
            <div style={{ width: '100%', height: 350, marginTop: 20 }}>
              <ResponsiveContainer>
                <BarChart 
                  data={data?.bookingStatusDistribution} 
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.1)" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    width={100}
                    tickFormatter={(val) => STATUS_MAP[val] || val}
                    tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(198, 169, 107, 0.05)' }} 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(198,169,107,0.2)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" fill="#C6A96B" radius={[0, 8, 8, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            </Card>
          </motion.div>
        </Col>

        <Col span={24} lg={12}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            <Card 
              title={<span className="text-xs font-black uppercase tracking-[0.2em] text-title">{t('analytics.top_services')}</span>} 
              className="glass-card border border-luxury/10 shadow-xl rounded-2xl"
            >
            <div style={{ width: '100%', height: 520, marginTop: 20 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={data?.serviceUsage}
                    cx="50%"
                    cy="42%"
                    innerRadius={0}
                    outerRadius={95}
                    dataKey="value"
                    labelLine={{ stroke: '#64748b', strokeWidth: 1 }}
                    label={({ cx, cy, midAngle, outerRadius, percent }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 28;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      if (percent < 0.03) return null;
                      return (
                        <text
                          x={x}
                          y={y}
                          fill="#94a3b8"
                          textAnchor={x > cx ? 'start' : 'end'}
                          dominantBaseline="central"
                          fontSize={11}
                          fontWeight={600}
                        >
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                  >
                    {data?.serviceUsage.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid rgba(198,169,107,0.2)' }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    align="center"
                    iconType="circle"
                    iconSize={9}
                    formatter={(value) => <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: '4px' }}>{value}</span>}
                    wrapperStyle={{ paddingTop: '32px' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

          </Card>
        </motion.div>
      </Col>
    </Row>
    </div>
  );
};

export default AnalyticsPage;
