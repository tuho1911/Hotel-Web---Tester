// @ts-nocheck
import React from 'react';
import { 
  Users, 
  Bed, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight,
  Package,
  Calendar,
  Ticket
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Card, Button, Badge, cn } from '../components/ui';

const stats = [
  { label: 'Total Rooms', value: '120', icon: Bed, color: 'text-info', bg: 'bg-info/10', trend: '+2.5%', trendUp: true },
  { label: 'Available', value: '45', icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', trend: '+12%', trendUp: true },
  { label: 'Occupied', value: '75', icon: Users, color: 'text-warning', bg: 'bg-warning/10', trend: '-5%', trendUp: false },
  { label: 'Inventory Alert', value: '12', icon: AlertTriangle, color: 'text-error', bg: 'bg-error/10', trend: 'Low Stock', trendUp: false },
];

const occupancyData = [
  { name: 'Mon', value: 65 },
  { name: 'Tue', value: 72 },
  { name: 'Wed', value: 85 },
  { name: 'Thu', value: 78 },
  { name: 'Fri', value: 92 },
  { name: 'Sat', value: 98 },
  { name: 'Sun', value: 88 },
];

const inventoryUsage = [
  { name: 'Towels', value: 400 },
  { name: 'Pillows', value: 300 },
  { name: 'Soaps', value: 200 },
  { name: 'Sheets', value: 150 },
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-title">Dashboard Overview</h1>
          <p className="text-muted">Welcome back, here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" className="hidden sm:flex gap-2">
            <Calendar className="w-4 h-4" />
            <span>Mar 31, 2026</span>
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            <span>New Booking</span>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <Card key={idx} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className={cn('p-3 rounded-xl', stat.bg)}>
                <stat.icon className={cn('w-6 h-6', stat.color)} />
              </div>
              <div className={cn('flex items-center gap-1 text-xs font-medium', stat.trendUp ? 'text-green-600' : 'text-red-600')}>
                {stat.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.trend}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-muted text-sm font-medium">{stat.label}</p>
              <h3 className="text-2xl font-bold mt-1 text-title">{stat.value}</h3>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Room Occupancy Rate</h3>
            <select className="bg-gray-50 border border-border rounded-lg px-2 py-1 text-sm outline-none">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={occupancyData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-lg mb-6">Inventory Status</h3>
          <div className="h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={inventoryUsage}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {inventoryUsage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-title">1,200</span>
              <span className="text-xs text-muted">Total Items</span>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {inventoryUsage.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                  <span className="text-sm text-text-muted">{item.name}</span>
                </div>
                <span className="text-sm font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Add Room', icon: Bed, color: 'bg-blue-50 text-blue-600' },
              { label: 'Import Stock', icon: Package, color: 'bg-green-50 text-green-600' },
              { label: 'Staff Shift', icon: Users, color: 'bg-purple-50 text-purple-600' },
              { label: 'New Voucher', icon: Ticket, color: 'bg-amber-50 text-amber-600' },
              { label: 'Reports', icon: TrendingUp, color: 'bg-indigo-50 text-indigo-600' },
              { label: 'Settings', icon: Plus, color: 'bg-gray-50 text-gray-600' },
            ].map((action, idx) => (
              <button key={idx} className="flex flex-col items-center justify-center p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group">
                <div className={cn('p-3 rounded-lg mb-2 group-hover:scale-110 transition-transform', action.color)}>
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-title">{action.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Recent Bookings</h3>
            <button className="text-primary text-sm font-medium hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {[
              { name: 'John Doe', room: '102', status: 'Checked In', time: '2h ago', price: '$450' },
              { name: 'Jane Smith', room: '301', status: 'Confirmed', time: '5h ago', price: '$2,500' },
              { name: 'Robert Brown', room: '205', status: 'Pending', time: '1d ago', price: '$180' },
            ].map((booking, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-primary">
                    {booking.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-title">{booking.name}</p>
                    <p className="text-xs text-muted">Room {booking.room} • {booking.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{booking.price}</p>
                  <Badge variant={booking.status === 'Checked In' ? 'success' : booking.status === 'Confirmed' ? 'info' : 'warning'}>
                    {booking.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
