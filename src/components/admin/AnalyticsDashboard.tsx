import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  BarChart3, 
  Users, 
  Eye, 
  Activity, 
  TrendingUp,
  Clock,
  MousePointer,
  AlertCircle
} from 'lucide-react';

interface AnalyticsSummary {
  totalEvents: number;
  uniqueUsers: number;
  pageViews: number;
  timeRange: string;
}

interface TopPage {
  page: string;
  views: number;
}

interface UserActivity {
  date: string;
  events: number;
  uniqueUsers: number;
}

interface PerformanceMetrics {
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  totalRequests: number;
}

interface RealTimeMetrics {
  activeUsers: number;
  recentEvents: number;
  eventsByType: Record<string, number>;
  timestamp: string;
}

interface DashboardData {
  summary: AnalyticsSummary;
  topPages: TopPage[];
  userActivity: UserActivity[];
  performance: PerformanceMetrics;
}

const AnalyticsDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalyticsData();
    fetchRealTimeMetrics();
    
    // Refresh real-time metrics every 30 seconds
    const interval = setInterval(fetchRealTimeMetrics, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/analytics/dashboard?timeRange=${timeRange}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data.data.dashboard);
      } else {
        setError('Failed to load analytics data');
      }
    } catch (err) {
      setError('Error loading analytics data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRealTimeMetrics = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/analytics/realtime', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setRealTimeMetrics(data.data);
      }
    } catch (err) {
      console.error('Error loading real-time metrics:', err);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatResponseTime = (ms: number) => {
    if (ms >= 1000) {
      return (ms / 1000).toFixed(2) + 's';
    }
    return Math.round(ms) + 'ms';
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchAnalyticsData} variant="outline" size="sm">
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Real-time Metrics */}
      {realTimeMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              Real-time Activity
              <span className="text-sm font-normal text-gray-500">
                (Last updated: {new Date(realTimeMetrics.timestamp).toLocaleTimeString()})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {realTimeMetrics.activeUsers}
                </div>
                <div className="text-sm text-gray-500">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {realTimeMetrics.recentEvents}
                </div>
                <div className="text-sm text-gray-500">Recent Events (1h)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Object.keys(realTimeMetrics.eventsByType).length}
                </div>
                <div className="text-sm text-gray-500">Event Types</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(dashboardData.summary.totalEvents)}</div>
              <p className="text-xs text-muted-foreground">
                in the last {timeRange === '1d' ? '24 hours' : timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : '90 days'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(dashboardData.summary.uniqueUsers)}</div>
              <p className="text-xs text-muted-foreground">
                active users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Page Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(dashboardData.summary.pageViews)}</div>
              <p className="text-xs text-muted-foreground">
                total page views
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatResponseTime(dashboardData.performance.avgResponseTime)}</div>
              <p className="text-xs text-muted-foreground">
                average response time
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pages">Top Pages</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="events">Event Types</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {dashboardData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    User Activity Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardData.userActivity.length > 0 ? (
                    <div className="space-y-3">
                      {dashboardData.userActivity.slice(-7).map((activity, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            {new Date(activity.date).toLocaleDateString()}
                          </span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-medium">
                              {activity.events} events
                            </span>
                            <span className="text-sm text-gray-500">
                              {activity.uniqueUsers} users
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      No activity data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MousePointer className="h-5 w-5" />
                    Event Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {realTimeMetrics && Object.keys(realTimeMetrics.eventsByType).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(realTimeMetrics.eventsByType)
                        .sort(([,a], [,b]) => b - a)
                        .map(([eventType, count]) => (
                          <div key={eventType} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 capitalize">
                              {eventType.replace('_', ' ')}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ 
                                    width: `${(count / Math.max(...Object.values(realTimeMetrics.eventsByType))) * 100}%` 
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium w-8 text-right">{count}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      No event data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Most Visited Pages
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData && dashboardData.topPages.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.topPages.map((page, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        <span className="font-medium">{page.page || 'Unknown Page'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ 
                              width: `${(page.views / Math.max(...dashboardData.topPages.map(p => p.views))) * 100}%` 
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{page.views}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No page view data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatResponseTime(dashboardData.performance.avgResponseTime)}
                    </div>
                    <div className="text-sm text-gray-500">Average Response Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {formatResponseTime(dashboardData.performance.maxResponseTime)}
                    </div>
                    <div className="text-sm text-gray-500">Max Response Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatNumber(dashboardData.performance.totalRequests)}
                    </div>
                    <div className="text-sm text-gray-500">Total Requests</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Event Types Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {realTimeMetrics && Object.keys(realTimeMetrics.eventsByType).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(realTimeMetrics.eventsByType).map(([eventType, count]) => (
                    <div key={eventType} className="p-4 border rounded-lg text-center">
                      <div className="text-2xl font-bold text-gray-900">{count}</div>
                      <div className="text-sm text-gray-500 capitalize">
                        {eventType.replace('_', ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No event type data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;