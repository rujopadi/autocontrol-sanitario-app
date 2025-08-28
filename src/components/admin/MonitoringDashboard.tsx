import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  Server,
  Database,
  Users,
  Clock
} from 'lucide-react';

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  timestamp: string;
  metrics?: {
    cpu: { usage: number };
    memory: { usage: number };
    database: { connection: { readyState: number } };
  };
  recentAlerts: number;
}

interface Alert {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  value?: any;
  threshold?: any;
}

interface Metrics {
  timestamp: string;
  cpu: { usage: number; cores: number };
  memory: { usage: number; total: number; used: number };
  database: {
    connection: { readyState: number };
    stats: { collections: number; dataSize: number };
  };
}

const MonitoringDashboard: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [metrics, setMetrics] = useState<Metrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMonitoringData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchMonitoringData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMonitoringData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch health status
      const healthResponse = await fetch('/api/monitoring/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setHealth(healthData.data);
      }

      // Fetch alerts
      const alertsResponse = await fetch('/api/monitoring/alerts?limit=10', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData.data.alerts);
      }

      // Fetch metrics
      const metricsResponse = await fetch('/api/monitoring/metrics?limit=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData.data.metrics);
      }

      setLoading(false);
    } catch (err) {
      setError('Error loading monitoring data');
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      critical: 'bg-red-100 text-red-800'
    };
    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      info: 'bg-blue-100 text-blue-800',
      warning: 'bg-yellow-100 text-yellow-800',
      critical: 'bg-red-100 text-red-800'
    };
    return (
      <Badge className={variants[severity as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
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
            <XCircle className="h-5 w-5 text-red-400" />
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
        <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
        <Button onClick={fetchMonitoringData} variant="outline" size="sm">
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* System Health Overview */}
      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(health.status)}
              System Health
              {getStatusBadge(health.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {health.metrics?.cpu?.usage?.toFixed(1) || 0}%
                </div>
                <div className="text-sm text-gray-500">CPU Usage</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {health.metrics?.memory?.usage?.toFixed(1) || 0}%
                </div>
                <div className="text-sm text-gray-500">Memory Usage</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {health.metrics?.database?.connection?.readyState === 1 ? 'Connected' : 'Disconnected'}
                </div>
                <div className="text-sm text-gray-500">Database</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {health.recentAlerts}
                </div>
                <div className="text-sm text-gray-500">Recent Alerts</div>
              </div>
            </div>

            {health.issues.length > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">Current Issues:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {health.issues.map((issue, index) => (
                    <li key={index}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">System Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          {/* System Metrics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  CPU & Memory Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metrics.length > 0 ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>CPU Usage</span>
                        <span>{metrics[metrics.length - 1]?.cpu?.usage?.toFixed(1) || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${metrics[metrics.length - 1]?.cpu?.usage || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Memory Usage</span>
                        <span>{metrics[metrics.length - 1]?.memory?.usage?.toFixed(1) || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${metrics[metrics.length - 1]?.memory?.usage || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Last updated: {new Date(metrics[metrics.length - 1]?.timestamp).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No metrics data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metrics.length > 0 && metrics[metrics.length - 1]?.database ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Connection Status</span>
                      <Badge className={
                        metrics[metrics.length - 1].database.connection.readyState === 1 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }>
                        {metrics[metrics.length - 1].database.connection.readyState === 1 ? 'Connected' : 'Disconnected'}
                      </Badge>
                    </div>
                    {metrics[metrics.length - 1].database.stats && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Collections</span>
                          <span className="font-medium">{metrics[metrics.length - 1].database.stats.collections}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Data Size</span>
                          <span className="font-medium">{formatBytes(metrics[metrics.length - 1].database.stats.dataSize)}</span>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No database metrics available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Recent Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length > 0 ? (
                <div className="space-y-3">
                  {alerts.map((alert, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="flex-shrink-0 mt-0.5">
                        {alert.severity === 'critical' && <XCircle className="h-5 w-5 text-red-500" />}
                        {alert.severity === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                        {alert.severity === 'info' && <CheckCircle className="h-5 w-5 text-blue-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{alert.message}</span>
                          {getSeverityBadge(alert.severity)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(alert.timestamp).toLocaleString()}
                        </div>
                        {alert.value && alert.threshold && (
                          <div className="text-xs text-gray-400 mt-1">
                            Value: {alert.value} | Threshold: {alert.threshold}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p>No recent alerts</p>
                  <p className="text-sm">System is running normally</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Response Times
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center text-gray-500 py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p>Performance metrics</p>
                  <p className="text-sm">Available in analytics dashboard</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Active Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center text-gray-500 py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p>User activity metrics</p>
                  <p className="text-sm">Available in analytics dashboard</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MonitoringDashboard;