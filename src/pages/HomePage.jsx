import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, Typography, Container, Button, ButtonGroup, Badge, Flow, Card, Icon, Genie, Input } from '@components/Components';
import { appService } from '../client/app.client';
import { useNotification } from '@contexts/NotificationContext';

const TAGLINES = [
  "Build Scalable Web Applications",
  "Full-Stack MERN Framework",
  "Production-Ready Infrastructure",
  "Real-Time Collaboration Built-In",
  "Developer-Friendly Architecture",
  "Full Observability & Persistent Logs",
  "Enterprise-Grade Security"
];

const HomePage = () => {
  const navigate = useNavigate();
  const { success, error: notifyError } = useNotification();
  const [taglineIndex, setTaglineIndex] = useState(0);
  const contactButtonRef = useRef(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    description: ''
  });

  const handleAnimationComplete = () => {
    setTaglineIndex((prev) => (prev + 1) % TAGLINES.length);
  };

  const handleContactFormChange = (field, value) => {
    setContactForm(prev => ({ ...prev, [field]: value }));
  };

  const handleContactFormSubmit = async (onClose) => {
    try {
      await appService.submitContactForm(contactForm);
      
      // Show success notification
      success('Thank you for your interest! Our team will contact you soon.');
      
      // Reset form
      setContactForm({
        name: '',
        email: '',
        phone: '',
        description: ''
      });

      // Close the genie modal if callback provided
      if (onClose && typeof onClose === 'function') {
        onClose();
      }
    } catch (error) {
      console.error('Error submitting contact form:', error);
      notifyError('An error occurred. Please try again.');
    }
  };

  return (
    <Page className="home-page">
      {/* Hero Section - Full Viewport Height */}
      <Container 
        layout="flex-column" 
        align="center" 
        justify="center" 
        padding="xl" 
        className="hero-section"
        height="100vh"
      >
        
        {/* Main Title */}
        <Typography 
          variant="h1" 
          size="3xl" 
          weight="bold" 
          align="center"
          animation="shiny"
          animationDelay={1000}
          animationDuration={2000}
          color='primary'
          marginBottom="md"
        >
          AI Base
        </Typography>

        {/* Rotating Taglines */}
        <Container layout="flex" align="center" justify="center" >
          <Typography 
            key={taglineIndex}
            variant="h2" 
            size="xl" 
            align="center"
            color="textSecondary"
            animation="typewriter"
            animationConfig={{
              typingSpeed: 50,
              deletingSpeed: 30,
              pauseDuration: 2000,
              loop: true,
              showCursor: true
            }}
            onAnimationComplete={handleAnimationComplete}
          >
            {TAGLINES[taglineIndex]}
          </Typography>
        </Container>

        {/* CTA Buttons */}
        <Container layout="flex">
          <ButtonGroup selectable={false}>
            <Button 
              variant="primary" 
              size="xl" 
              onClick={() => navigate('/components')}
            >
              Explore UI Components
            </Button>
            <Button 
              variant="secondary" 
              size="xl" 
              onClick={() => document.getElementById('infrastructure')?.scrollIntoView({ behavior: 'smooth' })}
            >
              View Infrastructure
            </Button>
            <Button 
              variant="tertiary" 
              size="xl" 
              onClick={() => {
                document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                setTimeout(() => {
                  contactButtonRef.current?.click();
                }, 800);
              }}
            >
              Contact Us
            </Button>
          </ButtonGroup>
        </Container>

        {/* Key Metrics / Badges */}
        <Container layout="flex" gap="xl" wrap="wrap" justify="center" marginTop="xl">
          <Badge size="lg" color="primary">20+ UI Components</Badge>
          <Badge size="lg" color="secondary">Dynamic Theming</Badge>
          <Badge size="lg" color="success">Extensive API Service</Badge>
          <Badge size="lg" color="warning">Enterprise Security</Badge>
        </Container>

      </Container>

      {/* Architecture Overview Section */}
      <Container 
        id="infrastructure"
        layout="flex-column" 
        align="center" 
        padding="xl"
      >
        <Typography 
          variant="h2" 
          size="2xl" 
          weight="bold" 
          align="center"
          marginBottom="md"
          animation="decrypt"
          animationConfig={{
            sequential: true,
            duration: 4000
          }}
        >
          Full-Stack Architecture
        </Typography>
        
        <Typography 
          size="md" 
          align="center"
         
          marginBottom="xl"
        >
          A complete solution for full-stack web apps, Just needs your ideas!
        </Typography>

        <Flow
          nodes={architectureNodes}
          edges={architectureEdges}
          size="lg"
          enableNodeCreation={true}
          nodeCreationKey="ctrl"
          controls={true}
          minimap={true}
          background={true}
          preventScrolling={false}
        />
      </Container>

      {/* Feature Showcase Section */}
      <Container 
        layout="flex-column" 
        align="center" 
        padding="xl"
      >
        <Typography 
          variant="h2" 
          size="xl" 
          weight="bold" 
          align="center"
          marginBottom="md"
          animation="proximity"
        >
          Core Features
        </Typography>
        
        <Typography 
          size="md" 
          align="center"
         
          marginBottom="xl"
        >
          Everything you need to build production-ready applications
        </Typography>

        <Container layout="flex" wrap={true} gap="xl" align="stretch" justify="center" maxWidth="1600px">
          
          {/* Feature 1: Authentication & Security */}
          <Card 
            width="100%"
            maxWidth="350px"
            minWidth="280px"
            hover={true} 
            padding="lg"
            genie={{
              trigger: 'hover',
              variant: 'popover',
              content: (
                <Container layout="flex-column" gap="xs" padding="sm">
                  <Typography weight="bold" size="xs">Authentication Flow</Typography>
                  <Container layout="flex" gap="xs" align="center"><Icon name="FiCheck" size="xs" color="success" /><Typography size="xs">JWT tokens & 2FA</Typography></Container>
                  <Container layout="flex" gap="xs" align="center"><Icon name="FiCheck" size="xs" color="success" /><Typography size="xs">Device fingerprinting</Typography></Container>
                  <Container layout="flex" gap="xs" align="center"><Icon name="FiCheck" size="xs" color="success" /><Typography size="xs">5-tier role hierarchy</Typography></Container>
                  <Container layout="flex" gap="xs" align="center"><Icon name="FiCheck" size="xs" color="success" /><Typography size="xs">Token blacklisting</Typography></Container>
                </Container>
              )
            }}
          >
            <Container layout="flex-column" gap="md" align="center">
              <Icon name="FiLock" size="xl" color="primary" />
              <Typography variant="h3" size="lg" weight="bold" align="center">
                Enterprise Authentication
              </Typography>
              <Typography size="sm" align="center">
                JWT-based auth with 2FA, device tracking, and role-based access control
              </Typography>
              <Container layout="flex" gap="sm" wrap="wrap" justify="center">
                <Badge color="primary" size="sm">JWT Tokens</Badge>
                <Badge color="warning" size="sm">2FA Support</Badge>
                <Badge color="success" size="sm">RBAC</Badge>
                <Badge color="secondary" size="sm">Device Tracking</Badge>
              </Container>
            </Container>
          </Card>

          {/* Feature 2: Intelligent Caching */}
          <Card 
            width="100%"
            maxWidth="350px"
            minWidth="280px"
            hover={true} 
            padding="lg"
            genie={{
              trigger: 'hover',
              variant: 'popover',
              content: (
                <Container layout="flex-column" gap="xs" padding="sm">
                  <Typography weight="bold" size="xs">Redis Caching</Typography>
                  <Container layout="flex" gap="xs" align="center"><Icon name="FiCheck" size="xs" color="success" /><Typography size="xs">~50% cache hit rate</Typography></Container>
                  <Container layout="flex" gap="xs" align="center"><Icon name="FiCheck" size="xs" color="success" /><Typography size="xs">Configurable TTL</Typography></Container>
                  <Container layout="flex" gap="xs" align="center"><Icon name="FiCheck" size="xs" color="success" /><Typography size="xs">Auto invalidation</Typography></Container>
                  <Container layout="flex" gap="xs" align="center"><Icon name="FiCheck" size="xs" color="success" /><Typography size="xs">{'<'}10ms response time</Typography></Container>
                </Container>
              )
            }}
          >
            <Container layout="flex-column" gap="md" align="center">
              <Icon name="FiZap" size="xl" color="success" />
              <Typography variant="h3" size="lg" weight="bold" align="center">
                Redis Caching Layer
              </Typography>
              <Typography size="sm" align="center">
                High-performance caching with automatic cleanup and invalidation
              </Typography>
              <Container layout="flex" gap="sm" wrap="wrap" justify="center">
                <Badge color="error" size="sm">Redis</Badge>
                <Badge color="success" size="sm">Auto-cleanup</Badge>
                <Badge color="primary" size="sm">TTL Management</Badge>
                <Badge color="warning" size="sm">Hit Tracking</Badge>
              </Container>
            </Container>
          </Card>

          {/* Feature 5: Dynamic Theming */}
          <Card 
            width="100%"
            maxWidth="350px"
            minWidth="280px"
            hover={true} 
            padding="lg"
            genie={{
              trigger: 'hover',
              variant: 'popover',
              content: (
                <Container layout="flex-column" gap="xs" padding="sm">
                  <Typography weight="bold" size="xs">Creating Custom Themes</Typography>
                  <Container layout="flex" gap="xs" align="center"><Icon name="FiCheck" size="xs" color="success" /><Typography size="xs">Simple CSS file creation</Typography></Container>
                  <Container layout="flex" gap="xs" align="center"><Icon name="FiCheck" size="xs" color="success" /><Typography size="xs">CSS variable overrides</Typography></Container>
                  <Container layout="flex" gap="xs" align="center"><Icon name="FiCheck" size="xs" color="success" /><Typography size="xs">Match any brand style</Typography></Container>
                  <Container layout="flex" gap="xs" align="center"><Icon name="FiCheck" size="xs" color="success" /><Typography size="xs">Hot-reload during dev</Typography></Container>
                </Container>
              )
            }}
          >
            <Container layout="flex-column" gap="md" align="center">
              <Icon name="FiDroplet" size="xl" color="tertiary" />
              <Typography variant="h3" size="lg" weight="bold" align="center">
                Dynamic Theming
              </Typography>
              <Typography size="sm" align="center">
                Create custom themes easily to match any brand style
              </Typography>
              <Typography size="xs" align="center">
                View our 6 example themes in the component showcase
              </Typography>
              <Container layout="flex" gap="sm" wrap="wrap" justify="center">
                <Badge color="primary" size="sm">Modern</Badge>
                <Badge color="neutral" size="sm">Dark</Badge>
                <Badge color="secondary" size="sm">Minimal</Badge>
                <Badge color="warning" size="sm">Vibrant</Badge>
                <Badge color="success" size="sm">Admin</Badge>
                <Badge color="error" size="sm">Pink</Badge>
              </Container>
            </Container>
          </Card>

          {/* Feature 6: Role-Based Access Control */}
          <Card 
            width="100%"
            maxWidth="350px"
            minWidth="280px"
            hover={true} 
            padding="lg"
            genie={{
              trigger: 'hover',
              variant: 'popover',
              content: (
                <Container layout="flex-column" gap="xs" padding="sm">
                  <Typography weight="bold" size="xs">Role Hierarchy</Typography>
                  <Container layout="flex" gap="xs" align="center"><Icon name="FiCheck" size="xs" color="success" /><Typography size="xs">5-tier permissions</Typography></Container>
                  <Container layout="flex" gap="xs" align="center"><Icon name="FiCheck" size="xs" color="success" /><Typography size="xs">Resource access control</Typography></Container>
                  <Container layout="flex" gap="xs" align="center"><Icon name="FiCheck" size="xs" color="success" /><Typography size="xs">Operation permissions</Typography></Container>
                  <Container layout="flex" gap="xs" align="center"><Icon name="FiCheck" size="xs" color="success" /><Typography size="xs">Complete audit trail</Typography></Container>
                </Container>
              )
            }}
          >
            <Container layout="flex-column" gap="md" align="center">
              <Icon name="FiShield" size="xl" color="error" />
              <Typography variant="h3" size="lg" weight="bold" align="center">
                Granular Permissions
              </Typography>
              <Typography size="sm" align="center">
                5-tier role hierarchy with permission-based resource access
              </Typography>
              <Container layout="flex" gap="sm" wrap="wrap" justify="center">
                <Badge color="error" size="sm">OWNER</Badge>
                <Badge color="warning" size="sm">ADMIN</Badge>
                <Badge color="primary" size="sm">SUPER_CREATOR</Badge>
                <Badge color="secondary" size="sm">CREATOR</Badge>
                <Badge color="neutral" size="sm">USER</Badge>
              </Container>
            </Container>
          </Card>

        </Container>
      </Container>

      {/* Section 4: Contact & CTA */}
      <Container 
        id="contact"
        layout="flex-column" 
        align="center" 
        justify="center"
        padding="xl"
        backgroundColor="surface"
      >
        <Typography 
          variant="h2" 
          size="xl" 
          weight="bold" 
          align="center"
          marginBottom="md"
          animation="gradient"
          animationDuration={3000}
          color="primary"
        >
          Ready to Build Your Application?
        </Typography>
        <Container layout="flex" align="center" justify="around" marginBottom="md" width="100%">
        <Typography 
          size="md" 
          align="center"
         
          marginBottom="xl"
        >
          Contact our team to start working on your application today
        </Typography>

        <Button 
          ref={contactButtonRef}
          variant="primary" 
          size="xl"
          genie={{
            trigger: 'click',
            variant: 'modal',
            content: ({ onClose }) => (
              <Container layout="flex-column" gap="lg" padding="xl">
                <Typography variant="h3" size="xl" weight="bold" align="center">
                  Let's Build Together
                </Typography>
                
                <Typography size="sm" align="center">
                  Tell us about your app idea and our team will get back to you soon
                </Typography>

                <Container layout="flex-column" gap="md" width="100%">
                  <Input 
                    label="Full Name"
                    placeholder="John Doe"
                    value={contactForm.name}
                    onChange={(e) => handleContactFormChange('name', e.target.value)}
                    width="100%"
                    required
                  />
                  
                  <Input 
                    label="Email Address"
                    type="email"
                    placeholder="john@example.com"
                    value={contactForm.email}
                    onChange={(e) => handleContactFormChange('email', e.target.value)}
                    width="100%"
                    required
                  />
                  
                  <Input 
                    label="Phone Number"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={contactForm.phone}
                    onChange={(e) => handleContactFormChange('phone', e.target.value)}
                    width="100%"
                  />
                  
                  <Input 
                    label="Project Description"
                    multiline
                    rows={5}
                    placeholder="Tell us about your website idea, features you need, timeline, budget, etc."
                    value={contactForm.description}
                    onChange={(e) => handleContactFormChange('description', e.target.value)}
                    width="100%"
                    required
                  />
                </Container>

                <Container layout="flex" gap="md" width="100%" justify="end">
                  <Button 
                    variant="primary" 
                    size="lg"
                    onClick={() => handleContactFormSubmit(onClose)}
                    disabled={!contactForm.name || !contactForm.email || !contactForm.description}
                  >
                    Submit Request
                  </Button>
                </Container>
              </Container>
            )
          }}
        >
          <Icon name="FiMail" size="xs" />
          Contact Us
        </Button>
        </Container>
      </Container>
    </Page>
  );
};

// Application Flow - Simple diagram
const architectureNodes = [
  // Frontend Group
  {
    id: 'frontend-group',
    type: 'group',
    position: { x: 50, y: 90 },
    style: { width: 600, height: 900 },
    data: { label: 'Frontend Application', color: 'secondary' }
  },
  // Frontend Children
  { id: 'react-app', type: 'editable', position: { x: 100, y: 80 }, parentId: 'frontend-group', extent: 'parent', data: { label: 'React App', color: 'primary', fontSize: 'md', fontWeight: 'bold', shape: 'circle' } },
  { id: 'auth-context', type: 'editable', position: { x: 50, y: 400 }, parentId: 'frontend-group', extent: 'parent', data: { label: 'Auth Context', color: 'warning', fontSize: 'sm', fontWeight: 'semibold', shape: 'rectangle' } },
  { id: 'theme-context', type: 'editable', position: { x: 270, y: 280 }, parentId: 'frontend-group', extent: 'parent', data: { label: 'Theme Context', color: 'success', fontSize: 'sm', fontWeight: 'semibold', shape: 'rectangle' } },
  { id: 'themes', type: 'editable', position: { x: 270, y: 420 }, parentId: 'frontend-group', extent: 'parent', data: { label: 'Themes', color: 'secondary', fontSize: 'xs', fontWeight: 'normal', shape: 'rectangle' } },
  { id: 'components', type: 'editable', position: { x: 270, y: 520 }, parentId: 'frontend-group', extent: 'parent', data: { label: 'Components', color: 'tertiary', fontSize: 'xs', fontWeight: 'normal', shape: 'rectangle' } },
  { id: 'api-client', type: 'editable', position: { x: 350, y: 80 }, parentId: 'frontend-group', extent: 'parent', data: { label: 'API Client', color: 'tertiary', fontSize: 'md', fontWeight: 'bold', shape: 'rectangle' } },
  
  // Pages Subflow (nested within frontend-group)
  {
    id: 'pages-group',
    type: 'group',
    position: { x: 50, y: 650 },
    parentId: 'frontend-group',
    extent: 'parent',
    style: { width: 500, height: 150 },
    data: { label: 'UI Pages', color: 'tertiary' }
  },
  // Pages Children
  { id: 'rbac-pages', type: 'editable', position: { x: 30, y: 70 }, parentId: 'pages-group', extent: 'parent', data: { label: 'Auth / RBAC Pages', color: 'warning', fontSize: 'xs', fontWeight: 'semibold', shape: 'rectangle' } },
  { id: 'general-pages', type: 'editable', position: { x: 260, y: 70 }, parentId: 'pages-group', extent: 'parent', data: { label: 'General Pages', color: 'neutral', fontSize: 'xs', fontWeight: 'semibold', shape: 'rectangle' } },

  // API Server Group
  {
    id: 'api-server-group',
    type: 'group',
    position: { x: 700, y: 50 },
    style: { width: 1300, height: 1000 },
    data: { label: 'API Server', color: 'primary' }
  },
  // Child Nodes (positions relative to group)
  { id: 'http-server', type: 'editable', position: { x: 250, y: 100 }, parentId: 'api-server-group', extent: 'parent', data: { label: 'Express HTTP Server', color: 'primary', fontSize: 'lg', fontWeight: 'bold', shape: 'rectangle' } },
  { id: 'security-middleware', type: 'editable', position: { x: 450, y: 300 }, parentId: 'api-server-group', extent: 'parent', data: { label: 'Security Middleware', color: 'error', fontSize: 'lg', fontWeight: 'bold', shape: 'diamond' } },
  { id: 'routes', type: 'editable', position: { x: 300, y: 500 }, parentId: 'api-server-group', extent: 'parent', data: { label: 'Routes', color: 'secondary', fontSize: 'lg', fontWeight: 'bold', shape: 'rectangle' } },
  { id: 'other-middleware', type: 'editable', position: { x: 250, y: 700 }, parentId: 'api-server-group', extent: 'parent', data: { label: 'Other Middleware', color: 'tertiary', fontSize: 'lg', fontWeight: 'bold', shape: 'rectangle' } },
  { id: 'controllers', type: 'editable', position: { x: 280, y: 900 }, parentId: 'api-server-group', extent: 'parent', data: { label: 'Controllers', color: 'success', fontSize: 'lg', fontWeight: 'bold', shape: 'rectangle' } },
  { id: 'models', type: 'editable', position: { x: 850, y: 900 }, parentId: 'api-server-group', extent: 'parent', data: { label: 'Models', color: 'success', fontSize: 'lg', fontWeight: 'bold', shape: 'rectangle' } },
  { id: 'logger', type: 'editable', position: { x: 550, y: 800 }, parentId: 'api-server-group', extent: 'parent', data: { label: 'Winston Logger', color: 'neutral', fontSize: 'md', fontWeight: 'bold', shape: 'rectangle' } },
  { id: 'redis-db', type: 'editable', position: { x: 50, y: 800 }, parentId: 'api-server-group', extent: 'parent', data: { label: 'Redis Cache', color: 'error', fontSize: 'lg', fontWeight: 'bold', shape: 'cylinder' } },
  { id: 'mongodb', type: 'editable', position: { x: 1000, y: 600 }, parentId: 'api-server-group', extent: 'parent', data: { label: 'MongoDB Atlas', color: 'success', fontSize: 'lg', fontWeight: 'bold', shape: 'cylinder' } },
];

const architectureEdges = [
  // Frontend Edges
  { 
    id: 'e-react-api', 
    source: 'react-app', 
    sourceHandle: 'right-source',
    target: 'api-client', 
    targetHandle: 'left-target',
    animated: true, 
    markerEnd: { type: 'arrowclosed' }
  },
  { 
    id: 'e-react-auth', 
    source: 'react-app', 
    sourceHandle: 'bottom-source',
    target: 'auth-context', 
    targetHandle: 'top-target',
    animated: true, 
    markerEnd: { type: 'arrowclosed' }
  },
  { 
    id: 'e-react-theme', 
    source: 'react-app', 
    sourceHandle: 'bottom-source',
    target: 'theme-context', 
    targetHandle: 'top-target',
    animated: true, 
    markerEnd: { type: 'arrowclosed' }
  },
  { 
    id: 'e-theme-themes', 
    source: 'theme-context', 
    sourceHandle: 'bottom-source',
    target: 'themes', 
    targetHandle: 'top-target',
    animated: true, 
    markerEnd: { type: 'arrowclosed' }
  },
  { 
    id: 'e-themes-components', 
    source: 'themes', 
    sourceHandle: 'bottom-source',
    target: 'components', 
    targetHandle: 'top-target',
    animated: true, 
    markerEnd: { type: 'arrowclosed' }
  },
  { 
    id: 'e-auth-rbac', 
    source: 'auth-context', 
    sourceHandle: 'bottom-source',
    target: 'rbac-pages', 
    targetHandle: 'top-target',
    animated: true, 
    markerEnd: { type: 'arrowclosed' }
  },
  { 
    id: 'e-components-rbac', 
    source: 'components', 
    sourceHandle: 'bottom-source',
    target: 'rbac-pages', 
    targetHandle: 'top-target',
    animated: true, 
    markerEnd: { type: 'arrowclosed' }
  },
  { 
    id: 'e-components-general', 
    source: 'components', 
    sourceHandle: 'bottom-source',
    target: 'general-pages', 
    targetHandle: 'top-target',
    animated: true, 
    markerEnd: { type: 'arrowclosed' }
  },

  // Cross-group Edges
  { 
    id: 'e-api-http', 
    source: 'api-client', 
    sourceHandle: 'right-source',
    target: 'http-server', 
    targetHandle: 'left-target',
    animated: true, 
    label: 'REST API',
    markerEnd: { type: 'arrowclosed' }
  },

  { 
    id: 'e2', 
    source: 'http-server', 
    sourceHandle: 'bottom-source',
    target: 'security-middleware',
    targetHandle: 'top-target',
    animated: true,
    markerEnd: { type: 'arrowclosed' }
  },
  {
    id: 'e4',
    source: 'security-middleware',
    sourceHandle: 'bottom-source',
    target: 'routes',
    targetHandle: 'top-target',
    animated: true,
    markerEnd: { type: 'arrowclosed' }
  },
  {
    id: 'e5',
    source: 'routes',
    sourceHandle: 'bottom-source',
    target: 'other-middleware',
    targetHandle: 'top-target',
    animated: true,
    markerEnd: { type: 'arrowclosed' }
  },
  {
    id: 'e6',
    source: 'other-middleware',
    sourceHandle: 'bottom-source',
    target: 'controllers',
    targetHandle: 'top-target',
    animated: true,
    markerEnd: { type: 'arrowclosed' }
  },
  {
    id: 'e7',
    source: 'controllers',
    sourceHandle: 'left-source',
    target: 'redis-db',
    targetHandle: 'right-target',
    animated: true,
    markerEnd: { type: 'arrowclosed' }
  },
  {
    id: 'e8',
    source: 'controllers',
    sourceHandle: 'right-source',
    target: 'models',
    targetHandle: 'left-target',
    animated: true,
    markerEnd: { type: 'arrowclosed' }
  },
  {
    id: 'e9',
    source: 'models',
    sourceHandle: 'right-source',
    target: 'mongodb',
    targetHandle: 'bottom-target',
    animated: true,
    markerEnd: { type: 'arrowclosed' }
  },
  {
    id: 'e11',
    source: 'controllers',
    sourceHandle: 'right-source',
    target: 'logger',
    targetHandle: 'left-target',
    animated: true,
    markerEnd: { type: 'arrowclosed' },
    label: 'HTTP log persistence'
  },
  {
    id: 'e13',
    source: 'logger',
    sourceHandle: 'right-source',
    target: 'models',
    targetHandle: 'left-target',
    animated: true,
    markerEnd: { type: 'arrowclosed' }
  },
];

export default HomePage;
