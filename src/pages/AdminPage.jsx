import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { appService } from '../client/app.client';
import { cacheService } from '../client/cache.client';
import { userService } from '../client/user.client';
import {
  Page,
  Container,
  Card,
  Button,
  Typography,
  Badge,
  ProgressBar,
  CircularProgress,
  Data,
  Icon,
  Input,
  Select,
  Switch,
  PageLoading,
  TreeView
} from '../components/Components';

/**
 * EditUserForm - Controlled form component for editing user data
 * Uses React state management for proper form interactions
 */
const EditUserForm = ({ user, onSave, onCancel }) => {
  const { success: showSuccess, error: showError } = useNotification();
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    username: user.username || '',
    email: user.email || '',
    profilePhoto: user.profilePhoto || '',
    roles: Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : ['USER']),
    active: user.active !== false
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const userId = user._id || user.id;
      
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        email: formData.email,
        profilePhoto: formData.profilePhoto,
        roles: formData.roles,
        active: formData.active
      };
      
      await userService.updateUser(userId, updateData);
      showSuccess(`User ${formData.firstName} ${formData.lastName} updated successfully`);
      
      onSave();
    } catch (error) {
      console.error('Error updating user:', error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      showError(`Failed to update user: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container layout="flex-column" gap="lg" padding="lg">
      <Typography as="h3" size="lg" weight="semibold">
        Edit User: {user.firstName || user.name} {user.lastName}
      </Typography>
      
      <Container layout="flex-column" gap="md">
        {/* Basic Information */}
        <Typography as="h4" size="md" weight="semibold" color="primary">
          Basic Information
        </Typography>
        
        <Container layout="grid" columns="2" gap="md">
          <Input
            label="First Name"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
          />
          
          <Input
            label="Last Name"
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
          />
        </Container>
        
        <Input
          label="Username"
          value={formData.username}
          onChange={(e) => handleInputChange('username', e.target.value)}
        />
        
        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
        />
        
        <Input
          label="Profile Photo URL"
          value={formData.profilePhoto}
          onChange={(e) => handleInputChange('profilePhoto', e.target.value)}
        />
        
        {/* Role & Permissions */}
        <Typography as="h4" size="md" weight="semibold" color="primary">
          Role & Permissions
        </Typography>
        
        <Select
          label="User Roles"
          multiSelect={true}
          value={formData.roles}
          onChange={(e) => handleInputChange('roles', e.target.value)}
          options={[
            { value: 'USER', label: 'User' },
            { value: 'CREATOR', label: 'Creator' },
            { value: 'SUPER_CREATOR', label: 'Super Creator' },
            { value: 'ADMIN', label: 'Admin' },
            { value: 'OWNER', label: 'Owner' }
          ]}
        />
        
        {/* Account Status */}
        <Typography as="h4" size="md" weight="semibold" color="primary">
          Account Status
        </Typography>
        
        <Container layout="flex" gap="xs" align="center">
          <Switch
            label="Active Account"
            checked={formData.active}
            onChange={(e) => handleInputChange('active', e.target.checked)}
          />
        </Container>
        
        {/* Additional Information */}
        <Typography as="h4" size="md" weight="semibold" color="primary">
          Account Information
        </Typography>
        
        <Container layout="grid" columns="2" gap="md">
          <Container layout="flex-column" gap="xs">
            <Typography size="sm" color="secondary">Created At</Typography>
            <Typography size="sm">{new Date(user.createdAt).toLocaleString()}</Typography>
          </Container>
          
          <Container layout="flex-column" gap="xs">
            <Typography size="sm" color="secondary">Last Updated</Typography>
            <Typography size="sm">{user.updatedAt ? new Date(user.updatedAt).toLocaleString() : 'N/A'}</Typography>
          </Container>
        </Container>
        
        {user.passwordChangedAt && (
          <Container layout="flex-column" gap="xs">
            <Typography size="sm" color="secondary">Password Last Changed</Typography>
            <Typography size="sm">{new Date(user.passwordChangedAt).toLocaleString()}</Typography>
          </Container>
        )}
      </Container>
      
      <Container layout="flex" gap="md" justify="end">
        <Button
          color="secondary"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        
        <Button
          color="primary"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <CircularProgress size="sm" />
              <span>Saving...</span>
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </Container>
    </Container>
  );
};

/**
 * AdminPage - Comprehensive administrative dashboard
 * 
 * Features:
 * - System health monitoring with real-time status
 * - Cache management and statistics
 * - User management with role controls
 * - Log viewing and analysis
 * - Email template testing
 * - Application statistics and metrics
 * - Performance metrics and diagnostics
 * 
 * Access: ADMIN and OWNER roles only
 */
export const AdminPage = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { success: showSuccess, error: showError, info: showInfo } = useNotification();

  // Comprehensive admin data state
  const [adminData, setAdminData] = useState({
    health: null,
    cache: null,
    logs: null,
    users: null,
    userStats: null, // Added for user overview statistics
    appStats: null, // Application statistics instead of settings
    roleRequests: null, // Added for role requests (owner only)
    errors: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [showDebugData, setShowDebugData] = useState(false); // Toggle for debug information

  // User statistics state
  const [userStatsCache, setUserStatsCache] = useState({}); // Cache individual user stats
  const [loadingUserStats, setLoadingUserStats] = useState({}); // Track loading states

  // Cache management state
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheRefreshed, setCacheRefreshed] = useState(false);

  // Email testing state
  const [emailTest, setEmailTest] = useState({
    isLoading: false,
    recipient: '',
    template: 'welcome',

    subject: 'Test Email'
  });

  // Logs loading state (simplified - now using sectionLoading)
  // const [loadingLogs, setLoadingLogs] = useState(false); // REMOVED: Using sectionLoading['logs'] instead

  // Role requests loading state (simplified - now using sectionLoading)  
  // const [loadingRoleRequests, setLoadingRoleRequests] = useState(false); // REMOVED: Using sectionLoading['role-requests'] instead

  // Application statistics display state (keeping for compatibility)
  const [systemSettings, setSystemSettings] = useState({
    isLoading: false,
    settings: {},
    hasChanges: false
  });

  // Check if user has admin access
  const hasAdminAccess = hasRole('ADMIN') || hasRole('OWNER');
  const hasOwnerAccess = hasRole('OWNER');

  // Define available admin sections (removed debug section)
  const sections = [
    { id: 'overview', label: 'System Overview', icon: 'FiMonitor' },
    { id: 'cache', label: 'Cache Management', icon: 'FiDatabase' },
    { id: 'users', label: 'User Statistics', icon: 'FiUsers' },
    { id: 'logs', label: 'Log Analysis', icon: 'FiFileText' },
    { id: 'email', label: 'Email Testing', icon: 'FiMail' },
    { id: 'appstats', label: 'Application Statistics', icon: 'FiBarChart3' },
    ...(hasOwnerAccess ? [{ id: 'role-requests', label: 'Role Requests', icon: 'FiUserCheck' }] : [])
  ];

  // Centralized loading state
  const [sectionLoading, setSectionLoading] = useState({});
  const sectionDataCache = useRef({});
  const sectionCacheTimeout = useRef({});

  // Single unified data loader function
  const loadSectionData = useCallback(async (section, forceRefresh = false) => {
    // Prevent duplicate calls for the same section
    if (sectionLoading[section] && !forceRefresh) {
      return;
    }

    // Check cache (valid for 30 seconds unless forced refresh)
    const cacheKey = section;
    const cached = sectionDataCache.current[cacheKey];
    const cacheValid = cached && !forceRefresh && 
      (Date.now() - (sectionCacheTimeout.current[cacheKey] || 0)) < 30000;
    
    if (cacheValid) {
      return;
    }

    // Set loading state
    setSectionLoading(prev => ({ ...prev, [section]: true }));
    
    try {
      let data = {};
      
      switch (section) {
        case 'overview':
        case 'appstats':
          const [health, appOverviewStats] = await Promise.all([
            appService.getHealth(),
            appService.getOverviewStats()
          ]);
          data = {
            health: health,
            appStats: appOverviewStats?.statistics || appOverviewStats
          };
          if (data.appStats) {
            setSystemSettings(prev => ({
              ...prev,
              settings: data.appStats
            }));
          }
          break;

        case 'cache':
          const cacheStats = await cacheService.getStats();
          data = {
            cache: cacheStats?.cacheStats || cacheStats
          };
          break;

        case 'users':
          const [userStatsData, userListData] = await Promise.all([
            userService.getStats(),
            userService.getUsers({ limit: 50 })
          ]);
          data = {
            users: userListData?.users || userListData?.data || [],
            userStats: userStatsData?.overview || userStatsData
          };
          break;

        case 'logs':
          const [logs, logStats] = await Promise.all([
            appService.getLogs({}), // Remove limit to get maximum logs possible
            appService.getLogStats()
          ]);
          data = {
            logs: logs?.logs || logs?.data || logs,
            logStats: logStats?.stats || logStats?.data || logStats
          };
          break;

        case 'role-requests':
          if (hasOwnerAccess) {
            const response = await userService.getRoleRequests();
            data = {
              roleRequests: response?.pendingRequests || response?.data?.pendingRequests || []
            };
          }
          break;

        case 'email':
          // Email section doesn't need to load data - it's just a form
          // Return early to avoid unnecessary processing
          return;

        default:
          console.warn(`Unknown section: ${section}`);
          return;
      }

      // Update adminData with the loaded data
      setAdminData(prev => ({
        ...prev,
        ...data
      }));

      // Cache the successful result
      sectionDataCache.current[cacheKey] = data;
      sectionCacheTimeout.current[cacheKey] = Date.now();

      if (forceRefresh) {
        showSuccess(`${section.charAt(0).toUpperCase() + section.slice(1)} data refreshed`);
      }

    } catch (error) {
      console.error(`Error loading ${section} data:`, error);
      showError(`Failed to load ${section} data`);
    } finally {
      setSectionLoading(prev => ({ ...prev, [section]: false }));
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [showError, showSuccess, hasOwnerAccess]);

  // Single useEffect for initial load and section changes
  useEffect(() => {
    if (!hasAdminAccess) return;
    
    loadSectionData(activeSection);
  }, [hasAdminAccess, activeSection, loadSectionData]);

  // Cleanup effect to clear caches on unmount
  useEffect(() => {
    return () => {
      // Clear any pending timeouts and caches
      Object.keys(sectionCacheTimeout.current).forEach(key => {
        clearTimeout(sectionCacheTimeout.current[key]);
      });
      sectionDataCache.current = {};
      sectionCacheTimeout.current = {};
    };
  }, []);

  // Simplified refresh function using the unified loader
  const refreshCurrentSection = () => {
    setRefreshing(true);
    loadSectionData(activeSection, true);
  };

  const loadUserStats = useCallback(async (userId) => {
    // Check if already loading or cached
    if (loadingUserStats[userId] || userStatsCache[userId]) {
      return userStatsCache[userId];
    }

    setLoadingUserStats(prev => ({ ...prev, [userId]: true }));
    
    try {
      const userStats = await userService.getUserStatsByUserId(userId);
      // Fix data structure access - server returns { success, message, stats, meta }
      const statsData = userStats?.stats || userStats; // Remove .data since interceptor already extracts it
      
      // Cache the stats
      setUserStatsCache(prev => ({ ...prev, [userId]: statsData }));
      
      return statsData;
    } catch (error) {
      console.error(`Error loading stats for user ${userId}:`, error);
      return null;
    } finally {
      setLoadingUserStats(prev => ({ ...prev, [userId]: false }));
    }
  }, [loadingUserStats, userStatsCache]);

  // Load data when section changes - only once per section change
  useEffect(() => {
    if (!hasAdminAccess) return;
    
    loadSectionData(activeSection);
  }, [hasAdminAccess, activeSection]); // Removed loadSectionData from deps to prevent loops

  // Clear cache and reset statistics using Redis commands
  const handleClearCache = async () => {
    setClearingCache(true);
    setCacheRefreshed(false);
    
    try {
      const result = await cacheService.clearCache();
      showSuccess('Cache data and statistics cleared successfully');
      
      // Only refresh cache section, not all data
      if (activeSection === 'cache') {
        await loadSectionData('cache', true);
      }
      
      // Show refresh indicator briefly
      setCacheRefreshed(true);
      setTimeout(() => setCacheRefreshed(false), 3000);
      
    } catch (error) {
      console.error('Cache clear error:', error);
      showError('Failed to clear cache - please try again');
    } finally {
      setClearingCache(false);
    }
  };

  // Get cache cleanup service status and configuration
  const [cleanupInfo, setCleanupInfo] = useState(null);
  const [loadingCleanup, setLoadingCleanup] = useState(false);
  const [runningCleanup, setRunningCleanup] = useState(false);
  const handleGetCleanupInfo = async () => {
    setLoadingCleanup(true);
    try {
      const result = await cacheService.getCleanupStatus();
      setCleanupInfo(result.cleanup);
      showInfo('Cache cleanup information retrieved');
    } catch (error) {
      console.error('Cache cleanup info error:', error);
      showError('Failed to get cache cleanup information');
    } finally {
      setLoadingCleanup(false);
    }
  };
  // Manual cache cleanup trigger
  const handleRunCleanup = async () => {
    setRunningCleanup(true);
    try {
      const result = await cacheService.triggerCleanup();
      showSuccess(`Manual cache cleanup completed! Cleaned ${result.cleanup?.keysRemoved || 0} keys`);
      
      // Only refresh cleanup info, don't reload entire section
      await handleGetCleanupInfo();
      
    } catch (error) {
      console.error('Manual cleanup error:', error);
      showError('Failed to run manual cache cleanup');
    } finally {
      setRunningCleanup(false);
    }
  };

  // Send test email
  const handleSendTestEmail = async () => {
    if (!emailTest.recipient) {
      showError('Please enter a recipient email');
      return;
    }
    
    setEmailTest(prev => ({ ...prev, isLoading: true }));
    try {
      await appService.sendTestEmail({
        to: emailTest.recipient,
        template: emailTest.template,
        subject: emailTest.subject,
        templateData: {
          firstName: 'Test',
          lastName: 'User',
          appName: 'AI Base'
        }
      });
      showSuccess(`Test email sent to ${emailTest.recipient}`);
      setEmailTest(prev => ({ ...prev, recipient: '' }));
    } catch (error) {
      showError('Failed to send test email');
    } finally {
      setEmailTest(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Bulk operations handlers

  if (isLoading) {
    return <PageLoading message="Loading admin dashboard..." />;
  }

  return (
    <Page 
      layout="flex-column"
      align="center"
      gap="lg" 
      padding="lg"
      theme="admin"
    >
      {/* Header */}
      <Container layout="flex" justify="between" align="center" gap="md" width="60%">
        <Container layout="flex-column" gap="xs">
          <Typography as="h1" size="3xl" weight="bold">
            Admin Dashboard
          </Typography>
          <Typography size="lg" color="secondary">
            System administration and monitoring
          </Typography>
        </Container>
        
        {/* System Health Indicator */}
        <Container layout="flex-column" align="end" gap="xs">
          <Badge 
           
            size="lg"
          >
            {adminData.health?.status === 'ok' ? '🟢 System Healthy' : '🔴 System Issues'}
          </Badge>
          <Typography size="xs" color="secondary">
            Last check: {adminData.health?.timestamp ? new Date(adminData.health.timestamp).toLocaleTimeString() : 'Unknown'}
          </Typography>
        </Container>
      </Container>
      
      {/* Action Buttons */}
      <Container layout="flex" gap="sm" justify="center">
        <Button 
          color="secondary" 
          onClick={() => loadSectionData(activeSection, true)}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </Button>        <Button onClick={() => navigate('/')}>
          Back to Dashboard
        </Button>
      </Container>

      {/* Section Navigation */}
      <Card padding="md">
        <Container layout="flex" gap="sm" style={{ flexWrap: 'wrap' }}>
          {sections.map(section => (
            <Button
              key={section.id}
             
              size="sm"
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </Button>
          ))}
        </Container>
      </Card>

      {/* Error Display */}
      {adminData.errors.length > 0 && (
        <Card color="error" padding="md">
          <Typography weight="semibold" marginBottom="sm">
            Data Loading Errors:
          </Typography>
          {adminData.errors.map((error, index) => (
            <Typography key={index} size="sm" marginBottom="xs">
              • {error}
            </Typography>
          ))}
        </Card>
      )}

      {/* System Overview Section */}
      {activeSection === 'overview' && (
        <Container layout="flex-column" gap="lg" align="center">
          <Typography as="h2" size="2xl" weight="semibold">
            System Overview
          </Typography>
          
          {/* System Status Header */}
          <Container layout="flex" justify="space-between" align="center">
            <Container layout="flex" align="center" gap="md">
              <Badge 
               
                size="lg"
              >
                {adminData.health?.status === 'ok' ? '🟢 System Healthy' : '🔴 System Issues'}
              </Badge>
              <Typography size="sm" color="secondary">
                Last updated: {adminData.health?.timestamp ? new Date(adminData.health.timestamp).toLocaleString() : 'Unknown'}
              </Typography>
            </Container>
            <Typography size="sm" color="secondary">
              Response Time: {adminData.health?.responseTimeMs?.toFixed(2)}ms
            </Typography>
          </Container>

          {/* Key Metrics Grid */}
          <Container layout="grid" columns="4" gap="md">
            {/* Environment & Platform */}
            <Card padding="md" color="tertiary">
              <Typography size="sm" color="secondary">Environment</Typography>
              <Typography size="xl" weight="bold">
                {adminData.health?.env?.toUpperCase() || 'Unknown'}
              </Typography>
              <Typography size="xs" color="secondary" marginTop="xs">
                Platform: {adminData.health?.system?.platform} ({adminData.health?.system?.arch})
              </Typography>
            </Card>
            
            {/* Uptime */}
            <Card padding="md" color="success">
              <Typography size="sm" color="secondary">System Uptime</Typography>
              <Typography size="xl" weight="bold">
                {adminData.health?.system?.uptime ? 
                  `${Math.floor(adminData.health.system.uptime / 3600)}h ${Math.floor((adminData.health.system.uptime % 3600) / 60)}m` 
                  : '0h 0m'}
              </Typography>
              <Typography size="xs" color="secondary" marginTop="xs">
                Node.js {adminData.health?.system?.nodeVersion}
              </Typography>
            </Card>
            
            {/* Database Status */}
            <Card padding="md">
              <Typography size="sm" color="secondary">Database</Typography>
              <Typography size="xl" weight="bold">
                {adminData.health?.database?.status?.toUpperCase() || 'Unknown'}
              </Typography>
              <Typography size="xs" color="secondary" marginTop="xs">
                Latency: {adminData.health?.database?.latencyMs}ms
              </Typography>
            </Card>
            
            {/* Memory Usage Summary */}
            <Card padding="md" color="warning">
              <Typography size="sm" color="secondary">Heap Memory</Typography>
              <Typography size="xl" weight="bold">
                {adminData.health?.system?.memoryUsage ? (() => {
                  const mem = adminData.health.system.memoryUsage;
                  return `${((mem.heapUsed / mem.heapTotal) * 100).toFixed(1)}%`;
                })() : 'N/A'}
              </Typography>
              <Typography size="xs" color="secondary" marginTop="xs">
                {adminData.health?.system?.memoryUsage ? (() => {
                  const mem = adminData.health.system.memoryUsage;
                  return `${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB / ${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB`;
                })() : 'Memory data unavailable'}
              </Typography>
            </Card>
          </Container>

          {/* Detailed System Information */}
          <Container layout="grid" columns="2" gap="md">
            {/* Memory Breakdown */}
            <Card padding="lg">
              <Typography weight="semibold" size="lg" marginBottom="md">
                Memory Breakdown
              </Typography>
              {adminData.health?.system?.memoryUsage ? (() => {
                const mem = adminData.health.system.memoryUsage;
                const heapUsedMB = (mem.heapUsed / 1024 / 1024).toFixed(2);
                const heapTotalMB = (mem.heapTotal / 1024 / 1024).toFixed(2);
                const heapPercent = mem.heapUsed / mem.heapTotal;
                const rssMB = (mem.rss / 1024 / 1024).toFixed(2);
                const externalMB = (mem.external / 1024 / 1024).toFixed(2);
                const arrayBuffersMB = (mem.arrayBuffers / 1024 / 1024).toFixed(2);
                
                return (
                <Container layout="flex-column" gap="md">
                  {/* Heap Memory Progress */}
                  <Container layout="flex-column" gap="xs">
                    <Container layout="flex" justify="space-between">
                      <Typography size="sm">Heap Memory:</Typography>
                      <Typography size="sm" weight="medium">
                        {heapUsedMB} MB / {heapTotalMB} MB
                      </Typography>
                    </Container>
                    <ProgressBar
                      value={mem.heapUsed}
                      max={mem.heapTotal}
                      variant={
                        heapPercent > 0.8 ? 'error' :
                        heapPercent > 0.6 ? 'warning' : 'success'
                      }
                      showPercentage={true}
                      size="sm"
                    />
                  </Container>

                  {/* Memory Details */}
                  <Container layout="flex-column" gap="sm">
                    <Container layout="flex" justify="space-between">
                      <Typography size="sm">RSS (Total):</Typography>
                      <Typography size="sm" weight="medium">
                        {rssMB} MB
                      </Typography>
                    </Container>
                    <Container layout="flex" justify="space-between">
                      <Typography size="sm">External:</Typography>
                      <Typography size="sm" weight="medium">
                        {externalMB} MB
                      </Typography>
                    </Container>
                    <Container layout="flex" justify="space-between">
                      <Typography size="sm">Array Buffers:</Typography>
                      <Typography size="sm" weight="medium">
                        {arrayBuffersMB} MB
                      </Typography>
                    </Container>
                  </Container>
                </Container>
                );
              })() : (
                <Typography size="sm" color="secondary">Memory data not available</Typography>
              )}
            </Card>

            {/* CPU & System Info */}
            <Card padding="lg">
              <Typography weight="semibold" size="lg" marginBottom="md">
                CPU & System Information
              </Typography>
              {adminData.health?.system ? (
                <Container layout="flex-column" gap="sm">
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Platform:</Typography>
                    <Typography size="sm" weight="medium">
                      {adminData.health.system.platform} ({adminData.health.system.arch})
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Node.js Version:</Typography>
                    <Typography size="sm" weight="medium">
                      {adminData.health.system.nodeVersion}
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Process Uptime:</Typography>
                    <Typography size="sm" weight="medium">
                      {Math.floor(adminData.health.system.uptime / 3600)}h {Math.floor((adminData.health.system.uptime % 3600) / 60)}m {Math.floor(adminData.health.system.uptime % 60)}s
                    </Typography>
                  </Container>
                  {adminData.health.system.cpuUsage && (
                    <>
                      <Container layout="flex" justify="space-between">
                        <Typography size="sm">CPU User Time:</Typography>
                        <Typography size="sm" weight="medium">
                          {(adminData.health.system.cpuUsage.user / 1000).toFixed(2)}ms
                        </Typography>
                      </Container>
                      <Container layout="flex" justify="space-between">
                        <Typography size="sm">CPU System Time:</Typography>
                        <Typography size="sm" weight="medium">
                          {(adminData.health.system.cpuUsage.system / 1000).toFixed(2)}ms
                        </Typography>
                      </Container>
                    </>
                  )}
                </Container>
              ) : (
                <Typography size="sm" color="secondary">System data not available</Typography>
              )}
            </Card>
          </Container>


            {/* Database Connection Details */}
            <Card padding="lg">
              <Typography weight="semibold" size="lg" marginBottom="md">
                Database Connection
              </Typography>
              {adminData.health?.database ? (
                <Container layout="flex-column" gap="sm">
                  <Container layout="flex" justify="space-between" align="center">
                    <Typography size="sm">Connection Status:</Typography>
                    <Badge 
                     
                      size="sm"
                    >
                      {adminData.health.database.status?.toUpperCase()}
                    </Badge>
                  </Container>
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Connection Type:</Typography>
                    <Typography size="sm" weight="medium">
                      {adminData.health.database.connection}
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Latency:</Typography>
                    <Typography size="sm" weight="medium" color={
                      adminData.health.database.latencyMs < 1 ? 'success' :
                      adminData.health.database.latencyMs < 10 ? 'warning' : 'error'
                    }>
                      {adminData.health.database.latencyMs}ms
                    </Typography>
                  </Container>
                </Container>
              ) : (
                <Typography size="sm" color="secondary">Database data not available</Typography>
              )}
            </Card>

          {/* Health Status Summary */}
          <Card padding="lg">
            <Container layout="flex" justify="space-between" align="center">
              <Container layout="flex-column" gap="xs">
                <Typography weight="semibold" size="lg">
                  Overall System Health: {adminData.health?.status === 'ok' ? 'Excellent' : 'Needs Attention'}
                </Typography>
                <Typography size="sm" color="secondary">
                  All core services are operational and responding within normal parameters
                </Typography>
              </Container>
              <Typography size="3xl">
                {adminData.health?.status === 'ok' ? '✅' : '⚠️'}
              </Typography>
            </Container>
          </Card>
        </Container>
      )}

      {/* Cache Management Section */}
      {activeSection === 'cache' && (
        <Container layout="flex-column" gap="lg" align="center">
          <Container layout="flex" justify="between" width="100%">
            <Container layout="flex-column">
              <Typography as="h2" size="2xl" weight="semibold">
                Cache Management
              </Typography>
              <Typography size="sm" marginTop="xs">
                Manage cached data and view cleanup service status
              </Typography>
            </Container>
            <Container layout="flex" gap="md">
              <Button 
                color="tertiary" 
                onClick={handleGetCleanupInfo}
                disabled={loadingCleanup}
              >
                {loadingCleanup ? 'Loading...' : 'Check Cleanup Status'}
              </Button>
              <Button 
                color="success" 
                onClick={handleRunCleanup}
                disabled={runningCleanup || loadingCleanup}
              >
                {runningCleanup ? 'Running Cleanup...' : 'Run Cleanup Now'}
              </Button>
              <Button 
                color="warning" 
                onClick={handleClearCache}
                disabled={clearingCache}
              >
                {clearingCache ? 'Clearing Cache...' : 'Clear All Cache Data'}
              </Button>
            </Container>
          </Container>

          {/* Cache Information Card */}
          <Card padding="lg" color="tertiary" width="100%">
            <Container layout="flex" align="center" gap="sm" marginBottom="sm">
              <Icon name="FaInfoCircle" color="tertiary" />
              <Typography weight="semibold">Cache Management Options</Typography>
            </Container>
            <Container layout="grid" columns="3" gap="lg">
              <Container layout="flex-column" gap="sm">
                <Typography weight="semibold" size="sm" color="info">
                  Check Cleanup Status
                </Typography>
                <Typography size="sm">
                  View the automated cleanup service configuration and statistics. Shows service status, 
                  next scheduled run, and historical cleanup data.
                </Typography>
              </Container>
              <Container layout="flex-column" gap="sm">
                <Typography weight="semibold" size="sm" color="success">
                  Run Cleanup Now (Conservative)
                </Typography>
                <Typography size="sm">
                  Manually trigger the conservative cleanup process that removes expired entries and temporary data. 
                  Safe operation that preserves valid cache data.
                </Typography>
              </Container>
              <Container layout="flex-column" gap="sm">
                <Typography weight="semibold" size="sm" color="warning">
                  Clear All Cache Data (Emergency)
                </Typography>
                <Typography size="sm">
                  Immediately removes ALL cached data using Redis flushAll(). Use for emergency situations, 
                  troubleshooting, or after major system updates.
                </Typography>
              </Container>
            </Container>
          </Card>

          {/* Cache Cleanup Service Information */}
          {cleanupInfo && (
            <Card padding="lg" color="success" width="100%">
              <Container layout="flex" align="center" justify="space-between" marginBottom="md">
                <Container layout="flex" align="center" gap="sm">
                  <Icon name="FaClock" color="success" />
                  <Typography weight="semibold">Cache Cleanup Service Status</Typography>
                </Container>
                <Button 
                  color="tertiary" 
                  size="sm"
                  onClick={() => setCleanupInfo(null)}
                >
                  <Icon name="FaTimes" size="xs" />
                  Close
                </Button>
              </Container>
              <Container layout="grid" columns="2" gap="lg">
                <Container layout="flex-column" gap="sm">
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Service Enabled:</Typography>
                    <Typography size="sm" weight="medium" color={cleanupInfo.enabled ? "success" : "warning"}>
                      {cleanupInfo.enabled ? "Active" : "Disabled"}
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Cleanup Interval:</Typography>
                    <Typography size="sm" weight="medium">
                      {cleanupInfo.intervalHours ? `${cleanupInfo.intervalHours} hours` : 'N/A'}
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Min Age for Cleanup:</Typography>
                    <Typography size="sm" weight="medium">
                      {cleanupInfo.minAgeHours ? `${cleanupInfo.minAgeHours} hours` : 'N/A'}
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Max Keys Per Run:</Typography>
                    <Typography size="sm" weight="medium">
                      {cleanupInfo.maxKeysPerRun || 'N/A'}
                    </Typography>
                  </Container>
                </Container>
                <Container layout="flex-column" gap="sm">
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Last Run:</Typography>
                    <Typography size="sm" weight="medium">
                      {cleanupInfo.lastRun ? new Date(cleanupInfo.lastRun).toLocaleString() : 'Never'}
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Next Scheduled:</Typography>
                    <Typography size="sm" weight="medium">
                      {cleanupInfo.nextRun ? new Date(cleanupInfo.nextRun).toLocaleString() : 'N/A'}
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Keys Cleaned (Last Run):</Typography>
                    <Typography size="sm" weight="medium">
                      {cleanupInfo.lastRunStats?.keysRemoved || 0}
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Total Cleanups:</Typography>
                    <Typography size="sm" weight="medium">
                      {cleanupInfo.totalRuns || 0}
                    </Typography>
                  </Container>
                </Container>
              </Container>
            </Card>
          )}

          {adminData.cache && (
            <Container layout="grid" columns="3" gap="md">
              {/* Redis Server Performance */}
              <Card padding="lg">
                <Container layout="flex" align="center" justify="space-between" marginBottom="md">
                  <Typography weight="semibold" size="lg">
                    Cache Performance
                  </Typography>
                  {isLoading && (
                    <CircularProgress size="sm" color="tertiary" />
                  )}
                  {cacheRefreshed && (
                    <Container layout="flex" align="center" gap="sm">
                      <Icon name="FaCheckCircle" color="success" size="sm" />
                      <Typography size="sm" color="success" weight="medium">
                        Refreshed
                      </Typography>
                    </Container>
                  )}
                </Container>
                <Container layout="flex-column" gap="sm">
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Hit Rate:</Typography>
                    <Typography size="sm" weight="medium" color="success">
                      {adminData.cache.cacheHitRate?.toFixed(2)}%
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Keyspace Hits:</Typography>
                    <Typography size="sm" weight="medium">
                      {adminData.cache.redisInfo?.stats?.keyspace_hits ? parseInt(adminData.cache.redisInfo.stats.keyspace_hits).toLocaleString() : 'N/A'}
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Keyspace Misses:</Typography>
                    <Typography size="sm" weight="medium">
                      {adminData.cache.redisInfo?.stats?.keyspace_misses ? parseInt(adminData.cache.redisInfo.stats.keyspace_misses).toLocaleString() : 'N/A'}
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Expired Keys:</Typography>
                    <Typography size="sm" weight="medium">
                      {adminData.cache.redisInfo?.stats?.expired_keys ? parseInt(adminData.cache.redisInfo.stats.expired_keys).toLocaleString() : 'N/A'}
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Evicted Keys:</Typography>
                    <Typography size="sm" weight="medium">
                      {adminData.cache.redisInfo?.stats?.evicted_keys ? parseInt(adminData.cache.redisInfo.stats.evicted_keys).toLocaleString() : 'N/A'}
                    </Typography>
                  </Container>
                </Container>
              </Card>

              {/* Memory Usage */}
              <Card padding="lg">
                <Typography weight="semibold" size="lg" marginBottom="md">
                  Memory Usage
                </Typography>
                <Container layout="flex-column" gap="sm">
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Used Memory:</Typography>
                    <Typography size="sm" weight="medium">
                      {adminData.cache.redisInfo?.memory?.used_memory_human || 'N/A'}
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Peak Memory:</Typography>
                    <Typography size="sm" weight="medium">
                      {adminData.cache.redisInfo?.memory?.used_memory_peak_human || 'N/A'}
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">RSS Memory:</Typography>
                    <Typography size="sm" weight="medium">
                      {adminData.cache.redisInfo?.memory?.used_memory_rss ? `${(parseInt(adminData.cache.redisInfo.memory.used_memory_rss) / 1024).toFixed(2)}K` : 'N/A'}
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Fragmentation Ratio:</Typography>
                    <Typography size="sm" weight="medium">
                      {adminData.cache.redisInfo?.memory?.mem_fragmentation_ratio || 'N/A'}
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Allocator:</Typography>
                    <Typography size="sm" weight="medium">
                      {adminData.cache.redisInfo?.memory?.mem_allocator || 'N/A'}
                    </Typography>
                  </Container>
                </Container>
              </Card>

              {/* Connection & Operations */}
              <Card padding="lg">
                <Typography weight="semibold" size="lg" marginBottom="md">
                  Connections & Operations
                </Typography>
                <Container layout="flex-column" gap="sm">
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Total Connections:</Typography>
                    <Typography size="sm" weight="medium">
                      {adminData.cache.redisInfo?.stats?.total_connections_received ? parseInt(adminData.cache.redisInfo.stats.total_connections_received).toLocaleString() : 'N/A'}
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Commands Processed:</Typography>
                    <Typography size="sm" weight="medium">
                      {adminData.cache.redisInfo?.stats?.total_commands_processed ? parseInt(adminData.cache.redisInfo.stats.total_commands_processed).toLocaleString() : 'N/A'}
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Ops per Second:</Typography>
                    <Typography size="sm" weight="medium">
                      {adminData.cache.redisInfo?.stats?.instantaneous_ops_per_sec || '0'}
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Rejected Connections:</Typography>
                    <Typography size="sm" weight="medium">
                      {adminData.cache.redisInfo?.stats?.rejected_connections || '0'}
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Last Updated:</Typography>
                    <Typography size="sm" weight="medium">
                      {adminData.cache.timestamp ? new Date(adminData.cache.timestamp).toLocaleTimeString() : 'N/A'}
                    </Typography>
                  </Container>
                </Container>
              </Card>
            </Container>
          )}
        </Container>
      )}

      {/* User Statistics Section */}
      {activeSection === 'users' && (
        <Container layout="flex-column" gap="lg" align="center">
          <Typography as="h2" size="2xl" weight="semibold">
            User Statistics & Analytics
          </Typography>

          {/* User Overview Statistics */}
          <Container layout="grid" columns="5" gap="md">
            <Card padding="md" color="tertiary">
              <Typography size="sm" color="secondary">Total Users</Typography>
              <Typography size="2xl" weight="bold">
                {adminData.userStats?.summary?.totalUsers?.toLocaleString() || 
                 (adminData.users && Array.isArray(adminData.users) ? adminData.users.length : 0)}
              </Typography>
              <Typography size="xs" color="secondary" marginTop="xs">
                Registered accounts
              </Typography>
            </Card>
            
            <Card padding="md" color="success">
              <Typography size="sm" color="secondary">Active Users</Typography>
              <Typography size="2xl" weight="bold">
                {adminData.userStats?.summary?.activeUsers?.toLocaleString() || 
                 (adminData.users && Array.isArray(adminData.users) ? 
                   adminData.users.filter(user => user.active !== false).length : 0)}
              </Typography>
              <Typography size="xs" color="secondary" marginTop="xs">
                Currently active
              </Typography>
            </Card>
            
            <Card padding="md" color="warning">
              <Typography size="sm" color="secondary">New This Week</Typography>
              <Typography size="2xl" weight="bold">
                {adminData.userStats?.summary?.newThisWeek || 0}
              </Typography>
              <Typography size="xs" color="secondary" marginTop="xs">
                Recent signups
              </Typography>
            </Card>
            
            <Card padding="md" color="tertiary">
              <Typography size="sm" color="secondary">Admin Users</Typography>
              <Typography size="2xl" weight="bold">
                {adminData.userStats?.summary?.adminUsers || 0}
              </Typography>
              <Typography size="xs" color="secondary" marginTop="xs">
                Admin + Owner roles
              </Typography>
            </Card>
            
            <Card padding="md" color="error">
              <Typography size="sm" color="secondary">Inactive Users</Typography>
              <Typography size="2xl" weight="bold">
                {adminData.userStats?.summary?.inactiveUsers || 0}
              </Typography>
              <Typography size="xs" color="secondary" marginTop="xs">
                Currently inactive
              </Typography>
            </Card>
          </Container>

          {/* All Users Data Table */}
          {adminData.users && adminData.users.length > 0 && (
            <Container layout="flex-column" gap="md" align="stretch">
              <Typography as="h3" size="lg" weight="semibold">
                All Users ({adminData.users.length} users)
              </Typography>
              <Data
                data={adminData.users}
               
                fieldConfig={{
                  firstName: {
                    component: Typography,
                    props: { size: 'sm', weight: 'medium' }
                  },
                  lastName: {
                    component: Typography,
                    props: { size: 'sm', weight: 'medium' }
                  },
                  username: {
                    component: Typography,
                    props: { size: 'sm', color: 'secondary' }
                  },
                  email: {
                    component: Typography,
                    props: { size: 'sm', color: 'primary' }
                  },
                  roles: {
                    component: Badge,
                    props: { size: 'small' },
                    transform: (value) => {
                      const role = Array.isArray(value) ? value[0] : value;
                      return {
                        variant: role === 'OWNER' ? 'error' : 
                                 role === 'ADMIN' ? 'warning' : 
                                 role === 'SUPER_CREATOR' ? 'success' :
                                 role === 'CREATOR' ? 'tertiary' : 'default',
                        children: role
                      };
                    }
                  },
                  active: {
                    component: Badge,
                    props: { size: 'small' },
                    transform: (value) => ({
                      variant: value ? 'success' : 'error',
                      children: value ? 'Active' : 'Inactive'
                    })
                  },
                  emailVerified: {
                    component: Badge,
                    props: { size: 'small' },
                    transform: (value) => ({
                      variant: value ? 'success' : 'warning',
                      children: value ? 'Verified' : 'Unverified'
                    })
                  },
                  twoFactorEnabled: {
                    component: Badge,
                    props: { size: 'small' },
                    transform: (value) => ({
                      variant: value ? 'success' : 'default',
                      children: value ? '2FA On' : '2FA Off'
                    })
                  },
                  profilePhoto: {
                    component: Typography,
                    props: { size: 'xs', color: 'muted' },
                    transform: (value) => ({
                      children: value && value !== 'default.jpg' ? '📷 Custom' : '📷 Default'
                    })
                  },
                  createdAt: {
                    component: Typography,
                    props: { size: 'xs', color: 'secondary' },
                    transform: (value) => ({
                      children: new Date(value).toLocaleDateString()
                    })
                  },
                  lastLogin: {
                    component: Typography,
                    props: { size: 'xs', color: 'muted' },
                    transform: (value) => ({
                      children: value ? new Date(value).toLocaleDateString() : 'Never'
                    })
                  }
                }}
                exclude={['_id', '__v', 'password', 'resetPasswordToken', 'resetPasswordExpires', 'emailVerificationToken']}
                searchable={true}
                filterable={true}
                paginated={true}
                pageSize={25}
                sortable={true}
                genie={{
                  trigger: 'contextmenu',
                  variant: 'modal',
                  content: (user) => <EditUserForm user={user} onSave={async () => {
                    await loadUserData();
                    document.querySelector('[data-genie-backdrop]')?.click();
                  }} onCancel={() => {
                    document.querySelector('[data-genie-backdrop]')?.click();
                  }} />
                }}
              />
            </Container>
          )}

          {/* Role Distribution */}
          <Card padding="lg">
            <Typography weight="semibold" size="lg" marginBottom="md">
              Role Distribution
            </Typography>
            {adminData.userStats?.roles ? (
              <Container layout="flex" gap="lg" style={{ flexWrap: 'wrap' }}>
                {adminData.userStats.roles.map((roleData) => (
                  <Container key={roleData.role} layout="flex-column" gap="xs" style={{ minWidth: '120px' }}>
                    <Typography size="sm" weight="semibold">{roleData.role}</Typography>
                    <Typography size="xl" weight="bold" color={
                      roleData.role === 'OWNER' ? 'tertiary' :
                      roleData.role === 'ADMIN' ? 'warning' :
                      roleData.role === 'CREATOR' || roleData.role === 'SUPER_CREATOR' ? 'info' : 'secondary'
                    }>
                      {roleData.count}
                    </Typography>
                    <ProgressBar
                      value={roleData.count}
                      max={adminData.userStats.summary.totalUsers}
                      variant={
                        roleData.role === 'OWNER' ? 'tertiary' :
                        roleData.role === 'ADMIN' ? 'warning' :
                        roleData.role === 'CREATOR' || roleData.role === 'SUPER_CREATOR' ? 'info' : 'secondary'
                      }
                      showPercentage={true}
                      size="sm"
                    />
                    <Typography size="xs" color="secondary">
                      {roleData.percentage}% of users
                    </Typography>
                  </Container>
                ))}
              </Container>
            ) : (
              <Typography size="sm" color="secondary">
                No detailed role statistics available from server
              </Typography>
            )}
          </Card>

          {/* User Activity Timeline */}
          <Card padding="lg">
            <Typography weight="semibold" size="lg" marginBottom="md">
              Recent User Activity & Analytics
            </Typography>
            
            {/* Registration Timeline from Server */}
            {adminData.userStats?.timeline?.data && (
              <Container layout="flex-column" gap="md" align="center">
                <Typography weight="semibold" size="md">
                  Registration Timeline ({adminData.userStats.timeline.period})
                </Typography>
                <Container layout="grid" columns={4} gap="sm">
                  {adminData.userStats.timeline.data.map((timeData, index) => (
                    <Card key={index} padding="sm" color="tertiary">
                      <Typography size="sm" weight="semibold">{timeData.period}</Typography>
                      <Typography size="lg" weight="bold" color="primary">
                        {timeData.count}
                      </Typography>
                      <Typography size="xs" color="secondary">new users</Typography>
                    </Card>
                  ))}
                </Container>
              </Container>
            )}

            {/* Fallback to basic user list if server stats not available */}
            {!adminData.userStats && adminData.users?.users && (
              <Container layout="flex-column" gap="sm">
                {adminData.users.users
                  .map((user, index) => (
                    <Container key={index} layout="flex" justify="space-between" align="center" 
                             style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--color-background-secondary)' }}>
                      <Container layout="flex" align="center" gap="md">
                        <Badge 
                          variant={
                            (Array.isArray(user.roles) ? user.roles[0] : user.roles) === 'OWNER' ? 'tertiary' :
                            (Array.isArray(user.roles) ? user.roles[0] : user.roles) === 'ADMIN' ? 'warning' :
                            (Array.isArray(user.roles) ? user.roles[0] : user.roles) === 'CREATOR' || 
                            (Array.isArray(user.roles) ? user.roles[0] : user.roles) === 'SUPER_CREATOR' ? 'info' : 'default'
                          }
                          size="sm"
                        >
                          {Array.isArray(user.roles) ? user.roles[0] : user.roles}
                        </Badge>
                        <Container layout="flex-column" gap="xs">
                          <Typography weight="medium">
                            {user.firstName} {user.lastName} (@{user.username})
                          </Typography>
                          <Typography size="sm" color="secondary">
                            {user.email}
                          </Typography>
                        </Container>
                      </Container>
                      <Container layout="flex-column" align="end" gap="xs">
                        <Badge 
                         
                          size="sm"
                        >
                          {user.active !== false ? 'Active' : 'Inactive'}
                        </Badge>
                        <Typography size="xs" color="secondary">
                          Joined {new Date(user.createdAt).toLocaleDateString()}
                        </Typography>
                      </Container>
                    </Container>
                  ))}
              </Container>
            )}
          </Card>

          {/* User Statistics Table */}
          {adminData.users?.users && (
            <Card padding="lg">
              <Typography weight="semibold" size="lg" marginBottom="md">
                User Details Overview
              </Typography>
              <Data
                data={adminData.users.users}
               
                fields={[
                  { key: 'firstName', label: 'Name', type: 'text', 
                    transform: (firstName, user) => `${firstName} ${user.lastName}` },
                  { key: 'username', label: 'Username', type: 'text' },
                  { key: 'email', label: 'Email', type: 'email' },
                  { 
                    key: 'roles', 
                    label: 'Role', 
                    type: 'badge',
                    transform: (roles) => Array.isArray(roles) ? roles[0] : roles
                  },
                  { 
                    key: 'active', 
                    label: 'Status', 
                    type: 'badge',
                    transform: (active) => active !== false ? 'Active' : 'Inactive'
                  },
                  { 
                    key: 'emailVerified', 
                    label: 'Email Verified', 
                    type: 'badge',
                    transform: (verified) => verified ? 'Verified' : 'Pending'
                  },
                  { key: 'createdAt', label: 'Joined', type: 'date' }
                ]}
                sortable={true}
                floatingCardContent={(item) => {
                  const UserStatsContent = () => {
                    const [userStats, setUserStats] = React.useState(null);
                    const [statsLoading, setStatsLoading] = React.useState(false);
                    
                    React.useEffect(() => {
                      const loadStats = async () => {
                        if (statsLoading || userStats) return;
                        
                        setStatsLoading(true);
                        try {
                          const stats = await loadUserStats(item._id || item.id);
                          setUserStats(stats);
                          } catch (error) {
                            console.error('Failed to load user stats:', error);
                          } finally {
                            setStatsLoading(false);
                          }
                        };
                        
                        loadStats();
                      }, []);
                      
                      if (statsLoading) {
                        return (
                          <Container layout="flex-column" gap="md" align="center" padding="lg" style={{ minWidth: '400px' }}>
                            <CircularProgress size="md" />
                            <Typography size="sm" color="secondary">Loading user statistics...</Typography>
                          </Container>
                        );
                      }
                      
                      if (!userStats) {
                        return (
                          <Container layout="flex-column" gap="sm" style={{ minWidth: '350px' }}>
                            <Typography weight="semibold">User Overview</Typography>
                            <Container layout="flex-column" gap="xs">
                              <Typography size="sm">
                                <strong>Name:</strong> {item.firstName} {item.lastName}
                              </Typography>
                              <Typography size="sm">
                                <strong>Username:</strong> @{item.username}
                              </Typography>
                              <Typography size="sm">
                                <strong>Role:</strong> {Array.isArray(item.roles) ? item.roles.join(', ') : item.roles}
                              </Typography>
                              <Typography size="sm">
                                <strong>Status:</strong> {item.active !== false ? 'Active' : 'Inactive'}
                              </Typography>
                              <Typography size="sm">
                                <strong>Joined:</strong> {new Date(item.createdAt).toLocaleDateString()}
                              </Typography>
                            </Container>
                            <Typography size="xs" color="secondary">
                              Detailed statistics not available
                            </Typography>
                            <Button size="sm" width="100%" onClick={() => navigate(`/users`)}>
                              View in User Management
                            </Button>
                          </Container>
                        );
                      }
                      
                      return (
                        <Container layout="flex-column" gap="md" style={{ minWidth: '450px', maxHeight: '500px', overflowY: 'auto' }}>
                          {/* Header with User Info */}
                          <Container layout="flex" justify="space-between" align="center">
                            <Typography weight="bold" size="lg">User Analytics</Typography>
                            <Badge 
                             
                              size="sm"
                            >
                              {userStats.user?.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </Container>
                          
                          {/* User Profile Section */}
                          <Card padding="sm">
                            <Typography weight="semibold" size="sm" marginBottom="xs">Profile Information</Typography>
                            <Container layout="grid" columns="2" gap="xs">
                              <Typography size="xs">
                                <strong>Name:</strong> {userStats.user?.firstName} {userStats.user?.lastName}
                              </Typography>
                              <Typography size="xs">
                                <strong>Username:</strong> @{userStats.user?.username}
                              </Typography>
                              <Typography size="xs">
                                <strong>Email:</strong> {userStats.user?.email}
                              </Typography>
                              <Typography size="xs">
                                <strong>Role:</strong> {Array.isArray(userStats.user?.roles) ? userStats.user.roles[0] : userStats.user?.roles}
                              </Typography>
                            </Container>
                          </Card>

                          {/* Activity Statistics */}
                          {userStats.activity && !userStats.limited && (
                            <Card padding="sm" color="tertiary">
                              <Typography weight="semibold" size="sm" marginBottom="xs">Activity Overview</Typography>
                              
                              {/* Last Login */}
                              {userStats.activity.lastLogin && (
                                <Container layout="flex" justify="space-between" marginBottom="xs">
                                  <Typography size="xs"><strong>Last Login:</strong></Typography>
                                  <Typography size="xs">{new Date(userStats.activity.lastLogin).toLocaleDateString()}</Typography>
                                </Container>
                              )}
                              
                              {/* Activity Breakdown */}
                              {userStats.activity.activityBreakdown?.length > 0 && (
                                <>
                                  <Typography size="xs" weight="semibold" marginTop="sm" marginBottom="xs">Activity Breakdown:</Typography>
                                  <Container layout="flex-column" gap="xs">
                                    {userStats.activity.activityBreakdown.slice(0, 4).map((activity, index) => (
                                      <Container key={index} layout="flex" justify="space-between" align="center">
                                        <Container layout="flex" gap="xs" align="center">
                                          <Badge size="sm" color={
                                            activity.type === 'AUTH' ? 'success' :
                                            activity.type === 'USER' ? 'info' :
                                            activity.type === 'FILE' ? 'warning' : 'default'
                                          }>
                                            {activity.type}
                                          </Badge>
                                          <Typography size="xs">{activity.operation}</Typography>
                                        </Container>
                                        <Container layout="flex" gap="xs" align="center">
                                          <Typography size="xs" weight="semibold">{activity.count}</Typography>
                                          <Typography size="xs" color="secondary">({activity.avgResponseTime}ms)</Typography>
                                        </Container>
                                      </Container>
                                    ))}
                                  </Container>
                                </>
                              )}
                              
                              {/* Total Activity Count */}
                              <Container layout="flex" justify="center" marginTop="sm">
                                <Badge color="tertiary" size="md">
                                  {userStats.activity.activityBreakdown?.reduce((sum, a) => sum + a.count, 0) || 0} Total Actions
                                </Badge>
                              </Container>
                            </Card>
                          )}

                          {/* Security Information */}
                          {userStats.security && !userStats.limited && (
                            <Card padding="sm" color="error">
                              <Typography weight="semibold" size="sm" marginBottom="xs">Security Status</Typography>
                              <Container layout="flex-column" gap="xs">
                                <Container layout="flex" justify="space-between">
                                  <Typography size="xs">2FA Enabled:</Typography>
                                  <Badge 
                                    size="sm" 
                                   
                                  >
                                    {userStats.security.twoFactorEnabled ? 'Yes' : 'No'}
                                  </Badge>
                                </Container>
                                
                                <Container layout="flex" justify="space-between">
                                  <Typography size="xs">Account Status:</Typography>
                                  <Badge 
                                    size="sm" 
                                   
                                  >
                                    {userStats.security.active ? 'Active' : 'Disabled'}
                                  </Badge>
                                </Container>
                                
                                <Typography size="xs">
                                  <strong>Member Since:</strong> {new Date(userStats.security.accountCreated).toLocaleDateString()}
                                </Typography>
                                
                                {userStats.security.lastPasswordChange && (
                                  <Typography size="xs">
                                    <strong>Password Changed:</strong> {new Date(userStats.security.lastPasswordChange).toLocaleDateString()}
                                  </Typography>
                                )}
                              </Container>
                            </Card>
                          )}

                          {/* Recent Login History */}
                          {userStats.activity?.loginHistory?.length > 0 && !userStats.limited && (
                            <Card padding="sm" color="tertiary">
                              <Typography weight="semibold" size="sm" marginBottom="xs">Recent Logins</Typography>
                              <Container layout="flex-column" gap="xs">
                                {userStats.activity.loginHistory.slice(0, 3).map((login, index) => (
                                  <Container key={index} layout="flex-column" gap="xs" 
                                           style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: 'var(--color-background-secondary)' }}>
                                    <Container layout="flex" justify="space-between">
                                      <Typography size="xs" weight="semibold">
                                        {new Date(login.timestamp).toLocaleDateString()}
                                      </Typography>
                                      <Badge size="sm" color={login.success ? 'success' : 'error'}>
                                        {login.success ? 'Success' : 'Failed'}
                                      </Badge>
                                    </Container>
                                    <Typography size="xs" color="secondary">
                                      {login.ip} • {login.userAgent?.split(' ')[0] || 'Unknown'}
                                    </Typography>
                                  </Container>
                                ))}
                              </Container>
                            </Card>
                          )}

                          {/* Action Button */}
                          <Container layout="flex" gap="sm">
                            <Button size="sm" color="secondary" onClick={() => navigate(`/users`)}>
                              User Management
                            </Button>
                            {(userStats.user?._id || userStats.user?.id) && (
                              <Button size="sm" onClick={() => {
                                // Could navigate to detailed user view or trigger more actions
                                showInfo(`Full stats for ${userStats.user.username} loaded successfully`);
                              }}>
                                View Details
                              </Button>
                            )}
                          </Container>
                        </Container>
                      );
                    };
                    
                    return <UserStatsContent />;
                  }}
                floatingTrigger="hover"
                
              />
            </Card>
          )}
        </Container>
      )}

      {/* Log Analysis Section */}
      {activeSection === 'logs' && (
        <Container layout="flex-column" gap="lg" align="center">
          <Typography as="h2" size="2xl" weight="semibold">
            Comprehensive Log Analytics
          </Typography>

          {/* Loading State */}
          {sectionLoading.logs && (
            <Container layout="flex-column" gap="md" align="center">
              <CircularProgress size="lg" />
              <Typography as="p" size="md" color="secondary">
                Loading system logs...
              </Typography>
            </Container>
          )}

          {/* All Logs Data Table */}
          {!sectionLoading.logs && adminData.logs && adminData.logs.length > 0 && (
            <Container layout="flex-column" gap="md" align="stretch">
              <Typography as="h3" size="lg" weight="semibold">
                Complete System Logs ({adminData.logs.length} entries)
              </Typography>
              <Data
                data={adminData.logs}
               
                fieldConfig={{
                  timestamp: {
                    component: Typography,
                    props: { size: 'sm', color: 'secondary' },
                    transform: (value) => ({
                      children: new Date(value).toLocaleString()
                    })
                  },
                  method: {
                    component: Badge,
                    props: { size: 'small' },
                    transform: (value) => ({
                      variant: value === 'POST' ? 'primary' : 
                               value === 'PUT' || value === 'PATCH' ? 'warning' : 
                               value === 'DELETE' ? 'error' : 'default',
                      children: value
                    })
                  },
                  url: {
                    component: Typography,
                    props: { size: 'sm' },
                    truncate: true,
                    maxLength: 80
                  },
                  statusCode: {
                    component: Badge,
                    props: { size: 'small' },
                    transform: (value) => ({
                      variant: value >= 500 ? 'error' : 
                               value >= 400 ? 'warning' : 
                               value >= 300 ? 'tertiary' : 'success',
                      children: value
                    })
                  },
                  responseTime: {
                    component: Typography,
                    props: { size: 'sm' },
                    transform: (value) => ({
                      children: value ? `${value}ms` : 'N/A',
                      color: value > 1000 ? 'error' : value > 500 ? 'warning' : 'default'
                    })
                  },
                  requestType: {
                    component: Badge,
                    props: { size: 'small' },
                    transform: (value) => ({
                      variant: value === 'AUTH' ? 'primary' : 
                               value === 'ADMIN' ? 'warning' : 
                               value === 'API' ? 'success' : 'default',
                      children: value
                    })
                  },
                  ip: {
                    component: Typography,
                    props: { size: 'xs', color: 'muted' }
                  },
                  userId: {
                    component: Typography,
                    props: { size: 'xs', color: 'primary' },
                    transform: (value) => ({
                      children: value || 'Anonymous'
                    })
                  },
                  userAgent: {
                    component: Typography,
                    props: { size: 'xs', color: 'muted' },
                    truncate: true,
                    maxLength: 100
                  },
                  contentType: {
                    component: Badge,
                    props: { size: 'small', variant: 'tertiary' }
                  },
                  contentLength: {
                    component: Typography,
                    props: { size: 'xs' },
                    transform: (value) => ({
                      children: value ? `${value} bytes` : 'N/A'
                    })
                  },
                  operationType: {
                    component: Badge,
                    props: { size: 'small' },
                    transform: (value) => ({
                      variant: value === 'CREATE' ? 'success' : 
                               value === 'UPDATE' ? 'warning' : 
                               value === 'DELETE' ? 'error' : 'default',
                      children: value
                    })
                  },
                  environment: {
                    component: Badge,
                    props: { size: 'small', variant: 'default' }
                  },
                  service: {
                    component: Typography,
                    props: { size: 'xs', color: 'muted' }
                  }
                }}
                exclude={['__v']}
                searchable={true}
                filterable={true}
                paginated={true}
                pageSize={15}
                sortable={true}
              />
            </Container>
          )}

          {/* Overview Statistics Grid */}
          <Container layout="grid" columns="4" gap="md">
            <Card padding="md" color="tertiary">
              <Typography size="sm" color="secondary">Total Logs</Typography>
              <Typography size="2xl" weight="bold">
                {(adminData.logStats?.overview?.totalLogs || 0).toLocaleString()}
              </Typography>
            </Card>
            <Card padding="md" color="success">
              <Typography size="sm" color="secondary">Today's Logs</Typography>
              <Typography size="2xl" weight="bold">
                {(adminData.logStats?.overview?.logsToday || 0).toLocaleString()}
              </Typography>
            </Card>
            <Card padding="md" color="warning">
              <Typography size="sm" color="secondary">Warnings Today</Typography>
              <Typography size="2xl" weight="bold">
                {(adminData.logStats?.warnings?.today || 0).toLocaleString()}
              </Typography>
            </Card>
            <Card padding="md" color="error">
              <Typography size="sm" color="secondary">Errors Today</Typography>
              <Typography size="2xl" weight="bold">
                {(adminData.logStats?.errors?.today || 0).toLocaleString()}
              </Typography>
            </Card>
          </Container>

          {/* Extended Timeline & Throughput Metrics */}
          <Container layout="grid" columns="2" gap="md">
            <Card padding="lg">
              <Typography weight="semibold" size="lg" marginBottom="md">
                Log Timeline Overview
              </Typography>
              <Container layout="flex-column" gap="sm">
                <Container layout="flex" justify="space-between">
                  <Typography size="sm">This Week:</Typography>
                  <Typography size="sm" weight="medium">
                    {(adminData.logStats?.overview?.logsThisWeek || 0).toLocaleString()}
                  </Typography>
                </Container>
                <Container layout="flex" justify="space-between">
                  <Typography size="sm">This Month:</Typography>
                  <Typography size="sm" weight="medium">
                    {(adminData.logStats?.overview?.logsThisMonth || 0).toLocaleString()}
                  </Typography>
                </Container>
                <Container layout="flex" justify="space-between">
                  <Typography size="sm">Yesterday:</Typography>
                  <Typography size="sm" weight="medium">
                    {(adminData.logStats?.overview?.logsYesterday || 0).toLocaleString()}
                  </Typography>
                </Container>
                <Container layout="flex" justify="space-between">
                  <Typography size="sm">Last Week:</Typography>
                  <Typography size="sm" weight="medium">
                    {(adminData.logStats?.overview?.logsLastWeek || 0).toLocaleString()}
                  </Typography>
                </Container>
              </Container>
            </Card>

            <Card padding="lg">
              <Typography weight="semibold" size="lg" marginBottom="md">
                System Throughput & Availability
              </Typography>
              <Container layout="flex-column" gap="sm">
                <Container layout="flex" justify="space-between">
                  <Typography size="sm">Avg Requests/Min:</Typography>
                  <Typography size="sm" weight="medium">
                    {adminData.logStats?.performance?.throughput?.avgRequestsPerMinute || 'N/A'}
                  </Typography>
                </Container>
                <Container layout="flex" justify="space-between">
                  <Typography size="sm">Peak Requests/Min:</Typography>
                  <Typography size="sm" weight="medium">
                    {adminData.logStats?.performance?.throughput?.maxRequestsPerMinute || 'N/A'}
                  </Typography>
                </Container>
                <Container layout="flex" justify="space-between">
                  <Typography size="sm">Service Availability:</Typography>
                  <Typography size="sm" weight="medium" color="success">
                    {adminData.logStats?.operations?.serviceAvailability?.availabilityPercentage || 'N/A'}%
                  </Typography>
                </Container>
                <Container layout="flex" justify="space-between">
                  <Typography size="sm">Active Sessions:</Typography>
                  <Typography size="sm" weight="medium">
                    {adminData.logStats?.businessIntelligence?.userSessions?.totalActiveSessions || 'N/A'}
                  </Typography>
                </Container>
              </Container>
            </Card>
          </Container>

          {/* System Health Summary */}
          {adminData.logStats?.summary && (
            <Card padding="lg" color="tertiary">
              <Typography weight="semibold" size="lg" marginBottom="md">
                System Health Summary
              </Typography>
              <Container layout="grid" columns="4" gap="md">
                <Container layout="flex-column" gap="xs" align="center">
                  <Typography size="sm" color="secondary">System Health</Typography>
                  <Typography size="2xl" weight="bold" color="primary">
                    {adminData.logStats.summary.systemHealth}%
                  </Typography>
                  <ProgressBar
                    value={adminData.logStats.summary.systemHealth || 0}
                    max={100}
                    variant={(adminData.logStats.summary.systemHealth || 0) > 95 ? 'success' : 
                             (adminData.logStats.summary.systemHealth || 0) > 85 ? 'warning' : 'error'}
                    showPercentage={false}
                    size="sm"
                  />
                </Container>
                <Container layout="flex-column" gap="xs" align="center">
                  <Typography size="sm" color="secondary">Error Rate</Typography>
                  <Typography size="2xl" weight="bold" color={(adminData.logStats.summary.errorRate || 0) > 10 ? 'error' : 'primary'}>
                    {adminData.logStats.summary.errorRate}%
                  </Typography>
                </Container>
                <Container layout="flex-column" gap="xs" align="center">
                  <Typography size="sm" color="secondary">Avg Response Time</Typography>
                  <Typography size="2xl" weight="bold" color="primary">
                    {adminData.logStats.summary.avgResponseTime?.toFixed(1)}ms
                  </Typography>
                </Container>
                <Container layout="flex-column" gap="xs" align="center">
                  <Typography size="sm" color="secondary">Daily Requests</Typography>
                  <Typography size="2xl" weight="bold" color="primary">
                    {adminData.logStats.summary.dailyRequestRate?.toFixed(0)}
                  </Typography>
                </Container>
              </Container>
            </Card>
          )}

          {/* Performance Metrics */}
          {adminData.logStats?.performance && (
            <Container layout="grid" columns="2" gap="md">
              <Card padding="lg">
                <Typography weight="semibold" size="lg" marginBottom="md">
                  Performance Metrics
                </Typography>
                <Container layout="flex-column" gap="sm">
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Average Response Time:</Typography>
                    <Typography size="sm" weight="medium">
                      {adminData.logStats.performance.basic?.avgResponseTime?.toFixed(2)}ms
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Min Response Time:</Typography>
                    <Typography size="sm" weight="medium">
                      {adminData.logStats.performance.basic?.minResponseTime}ms
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">Max Response Time:</Typography>
                    <Typography size="sm" weight="medium">
                      {adminData.logStats.performance.basic?.maxResponseTime}ms
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">95th Percentile:</Typography>
                    <Typography size="sm" weight="medium">
                      {adminData.logStats.performance.percentiles?.p95}ms
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between">
                    <Typography size="sm">99th Percentile:</Typography>
                    <Typography size="sm" weight="medium">
                      {adminData.logStats.performance.percentiles?.p99}ms
                    </Typography>
                  </Container>
                </Container>
              </Card>

              <Card padding="lg">
                <Typography weight="semibold" size="lg" marginBottom="md">
                  Slowest Endpoints
                </Typography>
                <Container layout="flex-column" gap="sm">
                  {(adminData.logStats.performance?.slowestEndpoints || []).map((endpoint, index) => (
                    <Container key={index} layout="flex" justify="space-between" align="center">
                      <Typography size="sm" style={{ maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {endpoint._id?.url || endpoint.endpoint}
                      </Typography>
                      <Badge color="warning" size="sm">
                        {endpoint.avgResponseTime?.toFixed(1)}ms
                      </Badge>
                    </Container>
                  ))}
                </Container>
              </Card>
            </Container>
          )}

          {/* Error Analysis */}
          {adminData.logStats?.errorAnalysis && (
            <Card padding="lg" color="error">
              <Typography weight="semibold" size="lg" marginBottom="md">
                Error Analysis
              </Typography>
              <Container layout="grid" columns="3" gap="md">
                <Container layout="flex-column" gap="xs" align="center">
                  <Typography size="sm" color="secondary">Error Ratio</Typography>
                  <Typography size="xl" weight="bold">
                    {adminData.logStats.errorAnalysis.errorRatio}%
                  </Typography>
                </Container>
                <Container layout="flex-column" gap="xs" align="center">
                  <Typography size="sm" color="secondary">Error Trend Today</Typography>
                  <Typography size="xl" weight="bold">
                    {adminData.logStats.errorAnalysis.errorTrendToday}%
                  </Typography>
                </Container>
                <Container layout="flex-column" gap="xs">
                  <Typography size="sm" color="secondary">Most Errored Endpoint</Typography>
                  <Typography size="sm" weight="medium" style={{ wordBreak: 'break-all' }}>
                    {adminData.logStats.errorAnalysis.mostErroredEndpoint}
                  </Typography>
                </Container>
              </Container>
            </Card>
          )}

          {/* Status Code Breakdown */}
          {adminData.logStats?.breakdowns?.statusCodes && (
            <Card padding="lg">
              <Typography weight="semibold" size="lg" marginBottom="md">
                Status Code Distribution
              </Typography>
              <Container layout="flex" gap="lg" style={{ flexWrap: 'wrap' }}>
                {adminData.logStats.breakdowns.statusCodes.map((stat, index) => (
                  <Container key={index} layout="flex-column" gap="xs" style={{ minWidth: '120px' }}>
                    <Typography size="sm" color="secondary">
                      {stat._id}
                    </Typography>
                    <Typography size="xl" weight="bold">
                      {stat.count.toLocaleString()}
                    </Typography>
                    <ProgressBar
                      value={stat.count}
                      max={adminData.logStats.overview?.totalLogs || 1}
                      variant={
                        stat._id.toString().includes('2xx') ? 'success' :
                        stat._id.toString().includes('3xx') ? 'info' :
                        stat._id.toString().includes('4xx') ? 'warning' : 'error'
                      }
                      showPercentage={true}
                      size="sm"
                    />
                  </Container>
                ))}
              </Container>
            </Card>
          )}

          {/* HTTP Method Breakdown */}
          {adminData.logStats?.breakdowns?.methods && (
            <Card padding="lg">
              <Typography weight="semibold" size="lg" marginBottom="md">
                HTTP Method Distribution
              </Typography>
              <Container layout="flex" gap="lg" style={{ flexWrap: 'wrap' }}>
                {adminData.logStats.breakdowns.methods.map((method, index) => (
                  <Container key={index} layout="flex-column" gap="xs" style={{ minWidth: '120px' }}>
                    <Typography size="sm" color="secondary">
                      {method._id}
                    </Typography>
                    <Typography size="xl" weight="bold">
                      {method.count.toLocaleString()}
                    </Typography>
                    <ProgressBar
                      value={method.count}
                      max={adminData.logStats.overview?.totalLogs || 1}
                      variant={
                        method._id === 'GET' ? 'success' :
                        method._id === 'POST' ? 'primary' :
                        method._id === 'PUT' || method._id === 'PATCH' ? 'warning' :
                        method._id === 'DELETE' ? 'error' : 'default'
                      }
                      showPercentage={true}
                      size="sm"
                    />
                    <Typography size="xs" color="secondary">
                      Avg: {method.avgResponseTime?.toFixed(1) || 'N/A'}ms
                    </Typography>
                  </Container>
                ))}
              </Container>
            </Card>
          )}

          {/* Business Intelligence */}
          {adminData.logStats?.businessIntelligence && (
            <Card padding="lg">
              <Typography weight="semibold" size="lg" marginBottom="md">
                Popular Endpoints
              </Typography>
              <Container layout="flex-column" gap="sm">
                {(adminData.logStats.businessIntelligence.endpointPopularity || []).map((endpoint, index) => (
                  <Container key={index} layout="flex" justify="space-between" align="center">
                    <Typography size="sm" style={{ maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {endpoint._id}
                    </Typography>
                    <Badge color="tertiary" size="sm">
                      {endpoint.count}
                    </Badge>
                  </Container>
                ))}
              </Container>
            </Card>
          )}

          {/* Security Analysis */}
          {adminData.logStats?.security && (
            <Card padding="lg" color="warning">
              <Typography weight="semibold" size="lg" marginBottom="md">
                Security Analysis
              </Typography>
              <Container layout="grid" columns="3" gap="md">
                <Container layout="flex-column" gap="xs" align="center">
                  <Typography size="sm" color="secondary">Rate Limit Violations</Typography>
                  <Typography size="xl" weight="bold">
                    {adminData.logStats.security.rateLimitViolations || 0}
                  </Typography>
                </Container>
                <Container layout="flex-column" gap="xs" align="center">
                  <Typography size="sm" color="secondary">Unique IPs</Typography>
                  <Typography size="xl" weight="bold">
                    {adminData.logStats.security.ipAnalysis?.totalUniqueIPs || 0}
                  </Typography>
                </Container>
                <Container layout="flex-column" gap="xs" align="center">
                  <Typography size="sm" color="secondary">Suspicious Activities</Typography>
                  <Typography size="xl" weight="bold">
                    {adminData.logStats.security.suspiciousActivity?.length || 0}
                  </Typography>
                </Container>
              </Container>
              
              {adminData.logStats.security.suspiciousActivity?.length > 0 && (
                <Container layout="flex-column" gap="sm" marginTop="md">
                  <Typography size="sm" weight="semibold">Recent Suspicious Activity:</Typography>
                  {adminData.logStats.security.suspiciousActivity.map((activity, index) => (
                    <Container key={index} layout="flex" justify="space-between" align="center" 
                             style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--color-background-secondary)' }}>
                      <Typography size="sm">{activity._id}</Typography>
                      <Typography size="xs" color="secondary">Failed: {activity.failedAttempts}</Typography>
                      <Badge color="error" size="sm">{activity.endpoints?.length || 0} endpoints</Badge>
                    </Container>
                  ))}
                </Container>
              )}
            </Card>
          )}

          {/* Traffic Patterns */}
          {adminData.logStats?.trafficPatterns && (
            <Container layout="grid" columns="2" gap="md">
              <Card padding="lg">
                <Typography weight="semibold" size="lg" marginBottom="md">
                  Peak Hours
                </Typography>
                <Container layout="flex-column" gap="sm">
                  {(adminData.logStats.trafficPatterns.peakHours || []).map((hour, index) => (
                    <Container key={index} layout="flex" justify="space-between" align="center">
                      <Typography size="sm">{hour._id}:00</Typography>
                      <Badge color="tertiary" size="sm">
                        {hour.count} requests
                      </Badge>
                    </Container>
                  ))}
                </Container>
              </Card>

              <Card padding="lg">
                <Typography weight="semibold" size="lg" marginBottom="md">
                  Usage Patterns
                </Typography>
                <Container layout="flex-column" gap="sm">
                  {(adminData.logStats.trafficPatterns.weekendVsWeekday || []).map((pattern, index) => (
                    <Container key={index} layout="flex" justify="space-between" align="center">
                      <Typography size="sm" weight="medium">{pattern._id}</Typography>
                      <Container layout="flex" gap="sm" align="center">
                        <Typography size="xs" color="secondary">
                          {pattern.count} requests
                        </Typography>
                        <Typography size="xs" color="secondary">
                          ({((pattern.count / (adminData.logStats.overview?.totalLogs || 1)) * 100).toFixed(1)}%)
                        </Typography>
                      </Container>
                    </Container>
                  ))}
                </Container>
              </Card>
            </Container>
          )}

          {/* Content Type & User Agent Analysis */}
          <Container layout="grid" columns="2" gap="md">
            <Card padding="lg">
              <Typography weight="semibold" size="lg" marginBottom="md">
                Content Type Distribution
              </Typography>
              <Container layout="flex-column" gap="sm">
                {(adminData.logStats?.businessIntelligence?.contentTypeDistribution || []).map((content, index) => (
                  <Container key={index} layout="flex" justify="space-between" align="center">
                    <Typography size="sm" style={{ maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {content._id}
                    </Typography>
                    <Container layout="flex" gap="sm" align="center">
                      <Typography size="xs" color="secondary">
                        {content.count} requests
                      </Typography>
                      <Badge color="tertiary" size="sm">
                        {content.avgResponseTime?.toFixed(1)}ms
                      </Badge>
                    </Container>
                  </Container>
                ))}
                {(!adminData.logStats?.businessIntelligence?.contentTypeDistribution || 
                  adminData.logStats.businessIntelligence.contentTypeDistribution.length === 0) && (
                  <Typography size="sm" color="secondary">No content type data available</Typography>
                )}
              </Container>
            </Card>

            <Card padding="lg">
              <Typography weight="semibold" size="lg" marginBottom="md">
                User Agent Analysis
              </Typography>
              <Container layout="flex-column" gap="sm">
                {(adminData.logStats?.breakdowns?.userAgentFamilies || []).map((ua, index) => (
                  <Container key={index} layout="flex" justify="space-between" align="center">
                    <Typography size="sm" weight="medium">{ua._id}</Typography>
                    <Container layout="flex" gap="sm" align="center">
                      <Typography size="xs" color="secondary">
                        {ua.count} requests
                      </Typography>
                      <Badge color="default" size="sm">
                        {ua.avgResponseTime?.toFixed(1)}ms
                      </Badge>
                    </Container>
                  </Container>
                ))}
                {(!adminData.logStats?.breakdowns?.userAgentFamilies || 
                  adminData.logStats.breakdowns.userAgentFamilies.length === 0) && (
                  <Typography size="sm" color="secondary">No user agent data available</Typography>
                )}
              </Container>
            </Card>
          </Container>

          {/* No logs available message */}
          {!sectionLoading.logs && (!adminData.logs || adminData.logs.length === 0) && (
            <Container layout="flex-column" gap="md" align="center">
              <Icon name="FiFileText" size="2xl" color="secondary" />
              <Typography as="p" size="lg" color="secondary">
                No system logs available
              </Typography>
              <Typography as="p" size="sm" color="secondary">
                Log data will appear here once the system starts generating logs.
              </Typography>
            </Container>
          )}
        </Container>
      )}

      {/* Email Testing Section */}
      {activeSection === 'email' && (
        <Container layout="flex-column" gap="lg" align="center">
          <Typography as="h2" size="2xl" weight="semibold">
            Email Testing
          </Typography>

          <Card padding="lg">
            <Typography weight="semibold" size="lg" marginBottom="md">
              Send Test Email
            </Typography>
            <Container layout="grid" columns="2" gap="md">
              <Input
                label="Recipient Email"
                type="email"
                value={emailTest.recipient}
                onChange={(e) => setEmailTest(prev => ({ ...prev, recipient: e.target.value }))}
                placeholder="test@example.com"
                required
              />
              <Select
                label="Template"
                value={emailTest.template}
                onChange={(value) => setEmailTest(prev => ({ 
                  ...prev, 
                  template: value
                }))}
                options={[
                  { value: 'welcome', label: 'Welcome Email' },
                  { value: 'password-reset', label: 'Password Reset' },
                  { value: 'password-changed', label: 'Password Changed' },
                  { value: 'security-alert', label: 'Security Alert' }
                ]}
              />
              <Input
                label="Subject"
                value={emailTest.subject}
                onChange={(e) => setEmailTest(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Test Email Subject"
              />
            </Container>
            <Container layout="flex" justify="end" marginTop="md">
              <Button 
                onClick={handleSendTestEmail}
                disabled={emailTest.isLoading || !emailTest.recipient}
              >
                {emailTest.isLoading ? 'Sending...' : 'Send Test Email'}
              </Button>
            </Container>
          </Card>
        </Container>
      )}

      {/* Application Statistics Section */}
      {activeSection === 'appstats' && (
        <Container layout="flex-column" gap="lg" align="center">
          <Container layout="flex" justify="space-between" align="center">
            <Typography as="h2" size="2xl" weight="semibold">
              Application Statistics
            </Typography>
            <Button 
              onClick={() => loadSectionData('appstats', true)}
              disabled={refreshing}
              color="secondary"
            >
              {refreshing ? 'Refreshing...' : 'Refresh Statistics'}
            </Button>
          </Container>

          {/* Application Overview Statistics */}
          {adminData.appStats && (
            <Container layout="grid" columns={2} gap="lg">
              {/* Summary Statistics */}
              <Card padding="lg">
                <Typography weight="semibold" size="lg">
                  Application Summary
                </Typography>
                <Container layout="flex-column" gap="sm">
                  <Container layout="flex" justify="space-between" align="center">
                    <Typography size="sm" color="secondary">Total Users:</Typography>
                    <Typography size="sm" weight="medium">{adminData.appStats.summary?.totalUsers || 0}</Typography>
                  </Container>
                  <Container layout="flex" justify="space-between" align="center">
                    <Typography size="sm" color="secondary">Active Users:</Typography>
                    <Typography size="sm" weight="medium">{adminData.appStats.summary?.activeUsers || 0}</Typography>
                  </Container>
                  <Container layout="flex" justify="space-between" align="center">
                    <Typography size="sm" color="secondary">Admin Users:</Typography>
                    <Typography size="sm" weight="medium">{adminData.appStats.summary?.adminUsers || 0}</Typography>
                  </Container>
                  <Container layout="flex" justify="space-between" align="center">
                    <Typography size="sm" color="secondary">Total Files:</Typography>
                    <Typography size="sm" weight="medium">{adminData.appStats.summary?.totalFiles || 0}</Typography>
                  </Container>
                  <Container layout="flex" justify="space-between" align="center">
                    <Typography size="sm" color="secondary">Total Requests:</Typography>
                    <Typography size="sm" weight="medium">{adminData.appStats.summary?.totalRequests || 0}</Typography>
                  </Container>
                  <Container layout="flex" justify="space-between" align="center">
                    <Typography size="sm" color="secondary">Error Rate:</Typography>
                    <Typography size="sm" weight="medium">{adminData.appStats.summary?.errorRate || 0}%</Typography>
                  </Container>
                </Container>
              </Card>

              {/* System Information */}
              <Card padding="lg">
                <Typography weight="semibold" size="lg" marginBottom="md">
                  System Information
                </Typography>
                <Container layout="flex-column" gap="sm">
                  <Container layout="flex" justify="space-between" align="center">
                    <Typography size="sm" color="secondary">Node Version:</Typography>
                    <Typography size="sm" weight="medium">{adminData.appStats.system?.nodeVersion || 'N/A'}</Typography>
                  </Container>
                  <Container layout="flex" justify="space-between" align="center">
                    <Typography size="sm" color="secondary">Platform:</Typography>
                    <Typography size="sm" weight="medium">{adminData.appStats.system?.platform || 'N/A'}</Typography>
                  </Container>
                  <Container layout="flex" justify="space-between" align="center">
                    <Typography size="sm" color="secondary">Environment:</Typography>
                    <Typography size="sm" weight="medium">{adminData.appStats.system?.environment || 'N/A'}</Typography>
                  </Container>
                  <Container layout="flex" justify="space-between" align="center">
                    <Typography size="sm" color="secondary">Uptime:</Typography>
                    <Typography size="sm" weight="medium">{Math.floor((adminData.appStats.system?.uptime || 0) / 3600)}h</Typography>
                  </Container>
                  <Container layout="flex" justify="space-between" align="center">
                    <Typography size="sm" color="secondary">Memory Used:</Typography>
                    <Typography size="sm" weight="medium">{adminData.appStats.system?.memory?.used || 0} MB</Typography>
                  </Container>
                </Container>
              </Card>

              {/* Services Status */}
              <Card padding="lg">
                <Typography weight="semibold" size="lg" marginBottom="md">
                  Services Status
                </Typography>
                <Container layout="flex-column" gap="sm">
                  <Container layout="flex" justify="space-between" align="center">
                    <Typography size="sm" color="secondary">Database:</Typography>
                    <Typography size="sm" weight="medium">
                      {adminData.appStats.services?.database?.status === 'connected' ? '🟢 Connected' : '🔴 Disconnected'}
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between" align="center">
                    <Typography size="sm" color="secondary">Cache:</Typography>
                    <Typography size="sm" weight="medium">
                      {adminData.appStats.services?.cache?.status === 'connected' ? '🟢 Connected' : '🔴 Disconnected'}
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between" align="center">
                    <Typography size="sm" color="secondary">Cache Hit Rate:</Typography>
                    <Typography size="sm" weight="medium">{adminData.appStats.services?.cache?.hitRate || 0}%</Typography>
                  </Container>
                  <Container layout="flex" justify="space-between" align="center">
                    <Typography size="sm" color="secondary">Email Service:</Typography>
                    <Typography size="sm" weight="medium">
                      {adminData.appStats.services?.email?.status === 'configured' ? '🟢 Configured' : '🔴 Not Configured'}
                    </Typography>
                  </Container>
                  <Container layout="flex" justify="space-between" align="center">
                    <Typography size="sm" color="secondary">Storage:</Typography>
                    <Typography size="sm" weight="medium">{adminData.appStats.services?.storage?.humanReadableSize || '0 MB'}</Typography>
                  </Container>
                </Container>
              </Card>

              {/* Activity Metrics */}
              <Card padding="lg">
                <Typography weight="semibold" size="lg" marginBottom="md">
                  Activity Metrics
                </Typography>
                <Container layout="flex-column" gap="sm">
                  <Container layout="flex" justify="space-between" align="center">
                    <Typography size="sm" color="secondary">Average Response Time:</Typography>
                    <Typography size="sm" weight="medium">{Math.round(adminData.appStats.activity?.avgResponseTime || 0)} ms</Typography>
                  </Container>
                  <Container layout="flex" justify="space-between" align="center">
                    <Typography size="sm" color="secondary">Total Errors:</Typography>
                    <Typography size="sm" weight="medium">{adminData.appStats.activity?.totalErrors || 0}</Typography>
                  </Container>
                  <Container layout="flex" justify="space-between" align="center">
                    <Typography size="sm" color="secondary">Analysis Period:</Typography>
                    <Typography size="sm" weight="medium">{adminData.appStats.activity?.period || 'N/A'}</Typography>
                  </Container>
                  <Container layout="flex" justify="space-between" align="center">
                    <Typography size="sm" color="secondary">Unique Visitors:</Typography>
                    <Typography size="sm" weight="medium">{adminData.appStats.summary?.uniqueVisitors || 0}</Typography>
                  </Container>
                </Container>
              </Card>
            </Container>
          )}

          {!adminData.appStats && (
            <Card padding="lg">
              <Typography size="sm" color="secondary">
                No application statistics data available. The statistics service may not be configured properly.
              </Typography>
            </Card>
          )}
        </Container>
      )}

      {/* Role Requests Section - Owner Only */}
      {activeSection === 'role-requests' && hasOwnerAccess && (
        <Container layout="flex-column" gap="lg" align="center">
          <Typography as="h2" size="2xl" weight="semibold">
            Role Request Management
          </Typography>
          <Typography as="p" size="md" color="secondary">
            Review and manage user role elevation requests
          </Typography>

          {/* Loading State */}
          {sectionLoading['role-requests'] && (
            <Container layout="flex-column" gap="md" align="center">
              <CircularProgress size="lg" />
              <Typography as="p" size="md" color="secondary">
                Loading role requests...
              </Typography>
            </Container>
          )}

          {/* Role Requests Table */}
          {!sectionLoading['role-requests'] && adminData.roleRequests && adminData.roleRequests.length > 0 && (
            <Container layout="flex-column" gap="md" align="stretch">
              <Typography as="h3" size="lg" weight="semibold">
                Pending Role Requests ({adminData.roleRequests.length})
              </Typography>
              <Data
                data={adminData.roleRequests}
               
                fieldConfig={{
                  user: {
                    component: Container,
                    props: { layout: 'flex-column', gap: 'xs' },
                    transform: (value, item) => ({
                      children: [
                        React.createElement(Typography, { key: 'name', size: 'sm', weight: 'medium' }, 
                          `${item?.firstName || ''} ${item?.lastName || ''}`.trim() || item?.username || 'Unknown User'),
                        React.createElement(Typography, { key: 'email', size: 'xs', color: 'secondary' }, 
                          item?.email || 'No email')
                      ]
                    })
                  },
                  currentRoles: {
                    component: Container,
                    props: { layout: 'flex', gap: 'xs', style: { flexWrap: 'wrap' } },
                    transform: (value) => ({
                      children: (Array.isArray(value) ? value : [value || 'USER']).map((role, index) => 
                        React.createElement(Badge, { 
                          key: index, 
                          size: 'small',
                          variant: role === 'ADMIN' ? 'warning' : role === 'OWNER' ? 'error' : 'default'
                        }, role)
                      )
                    })
                  },
                  pendingRoles: {
                    component: Container,
                    props: { layout: 'flex', gap: 'xs', style: { flexWrap: 'wrap' } },
                    transform: (value) => ({
                      children: (Array.isArray(value) ? value : [value || 'ADMIN']).map((role, index) => 
                        React.createElement(Badge, { 
                          key: index, 
                          size: 'small',
                          variant: role === 'ADMIN' ? 'warning' : role === 'OWNER' ? 'error' : 'primary'
                        }, role)
                      )
                    })
                  },
                  roleApprovalRequest: {
                    component: Typography,
                    props: { size: 'sm' },
                    transform: (value) => ({
                      children: value?.reason || value?.message || 'No reason provided',
                      style: { maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }
                    })
                  },
                  requestDate: {
                    component: Typography,
                    props: { size: 'sm', color: 'secondary' },
                    transform: (value, item) => ({
                      children: item?.roleApprovalRequest?.requestedAt ? 
                        new Date(item.roleApprovalRequest.requestedAt).toLocaleDateString() : 
                        'Unknown'
                    })
                  },
                  roleApprovalStatus: {
                    component: Badge,
                    props: { size: 'small' },
                    transform: (value) => ({
                      variant: value === 'APPROVED' ? 'success' : 
                               value === 'REJECTED' ? 'error' : 'tertiary',
                      children: value || 'PENDING'
                    })
                  }
                }}
                columns={['user', 'currentRoles', 'pendingRoles', 'roleApprovalRequest', 'requestDate', 'roleApprovalStatus']}
                headers={{
                  user: 'User',
                  currentRoles: 'Current Roles',
                  pendingRoles: 'Requested Roles',
                  roleApprovalRequest: 'Reason',
                  requestDate: 'Request Date',
                  roleApprovalStatus: 'Status'
                }}
                genie={{
                  trigger: 'contextmenu',
                  variant: 'menu',
                  content: (item, rowIndex) => {
                    if (item?.roleApprovalStatus === 'PENDING') {
                      return (
                        <Container layout="flex-column" gap="xs" padding="xs">
                          <Typography as="h4" size="sm" weight="semibold">Actions</Typography>
                          <Button 
                            
                            size="sm" 
                            align="left"
                            onClick={async () => {
                              try {
                                await userService.approveRoleRequest(item.id);
                                showSuccess('Role request approved successfully');
                                await loadRoleRequestsData();
                              } catch (error) {
                                showError('Failed to approve role request');
                              }
                            }}
                          >
                            <Icon name="FiCheck" size="sm" />
                            Approve Request
                          </Button>
                          <Button 
                            
                            size="sm" 
                            align="left"
                            onClick={async () => {
                              try {
                                const reason = prompt('Enter rejection reason (optional):');
                                await userService.rejectRoleRequest(item.id, reason);
                                showSuccess('Role request rejected');
                                await loadRoleRequestsData();
                              } catch (error) {
                                showError('Failed to reject role request');
                              }
                            }}
                            color="error"
                          >
                            <Icon name="FiX" size="sm" />
                            Reject Request
                          </Button>
                        </Container>
                      );
                    }
                    return (
                      <Container layout="flex-column" gap="xs" padding="xs">
                        <Typography as="p" size="sm" color="secondary">
                          Request Already Processed
                        </Typography>
                      </Container>
                    );
                  }
                }}
              />
            </Container>
          )}

          {/* No role requests message */}
          {!sectionLoading['role-requests'] && (!adminData.roleRequests || adminData.roleRequests.length === 0) && (
            <Container layout="flex-column" gap="md" align="center">
              <Icon name="FiUserCheck" size="2xl" color="secondary" />
              <Typography as="p" size="lg" color="secondary">
                No role requests available
              </Typography>
              <Typography as="p" size="sm" color="secondary">
                User role elevation requests will appear here when submitted.
              </Typography>
            </Container>
          )}

          {/* Refresh Button */}
          <Button 
            color="secondary" 
            onClick={() => loadRoleRequestsData()}
            disabled={sectionLoading['role-requests']}
          >
            Refresh Role Requests
          </Button>
        </Container>
      )}
    </Page>
  );
};

export default AdminPage;
