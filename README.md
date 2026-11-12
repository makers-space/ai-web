# AI Base Web - React Frontend

> **React Application with Advanced Theming and Complete UI Component Library**

A comprehensive React web application with an advanced theming system, complete UI component library, and robust API client integration.

## 🌟 Key Features
- **Dynamic Theming System**: 7 beautiful themes with instant switching
- **Complete Component Library**: 20+ production-ready UI components  
- **Advanced Layout System**: Flex, Grid, Multi-column, and Positioned layouts
- **Interactive Demo**: Live component playground with theme switching
- **Floating Action Button**: Draggable FAB with smart positioning
- **Genie System**: Context-aware popover/tooltip system
- **Rich Text Editor**: MDX Editor with full theme integration
- **Data Visualization**: TreeView, Data tables, Progress indicators
- **Responsive Design**: Mobile-first approach with breakpoint system
- **API Integration**: Pre-configured Axios clients with authentication
- **Context Providers**: Auth, Theme, and Notification contexts
- **Route Protection**: Role-based route access control

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation & Setup

1. **Navigate to the web directory**:
   ```bash
   cd web
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Backend Connection** (Optional):
   
   By default, the app connects to `http://localhost:8090/api/v1`. To change this, edit:
   
   ```javascript
   // src/client/app.client.js
   export const API_BASE_URL = 'http://localhost:8090/api/v1';
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   # App runs on http://localhost:8098
   ```

5. **Open your browser**:
   Navigate to `http://localhost:8098`

### Available Scripts
- `npm run dev` - Start development server (port 8088)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### First Run

After starting the app:

1. **Navigate to** `http://localhost:8098`
2. **Sign up** for a new account (first-time users) or **login** if you already have an account
3. **Explore** the component demo, file management, and other features

**Note**: The application does not include pre-seeded test accounts. You must create your own account through the signup page.

## 🎨 Theme System Architecture

The application uses a sophisticated CSS-based theming system that provides:

### Dynamic Theme Switching
- **Real-time theme changes** without page reload
- **CSS Custom Properties** for consistent styling
- **Theme persistence** via localStorage
- **Fallback support** for graceful degradation

### Color System
Each theme provides a comprehensive color palette:
- **Primary/Secondary Colors** with accent variants
- **Tertiary/Neutral Colors** for supporting elements  
- **Status Colors**: Success, Warning, Error, Info
- **Typography Colors**: Text, muted, contrast variants
- **Background Colors**: Surface, elevated, transparent options

## 🎭 Available Themes

The application includes 7 professionally designed themes:

| Theme | Description | Font Family | Best For |
|-------|-------------|-------------|----------|
| **Modern** | Clean, professional design with contemporary aesthetics | Urbanist & Montserrat Alternates | Business applications |
| **Dark** | High-contrast dark mode with modern typography | Urbanist & Share Tech Mono | Developer tools, night usage |
| **Minimal** | Ultra-clean design focused on content and readability | Advent Pro & Nova Mono | Documentation, reading apps |
| **Vibrant** | Colorful, energetic design with bold styling | Gloria Hallelujah & VT323 | Creative apps, portfolios |
| **Admin** | Professional enterprise interface with subtle shadows | Jura & Roboto Mono | Admin dashboards, enterprise |
| **Pink** | Playful and vibrant design with a pink color palette | Custom fonts | Creative applications |

## 🧩 Component Library

### Layout Components
- **Page**: Base page container with layout support
- **Container**: Flexible layout container (flex, grid, multi-column, positioned)
- **Card**: Visual container extending Container with styling

### Form & Input Components
- **Button**: Themed button with variants and Genie integration
- **ButtonGroup**: Grouped buttons with single-selection behavior
- **Input**: Enhanced input with validation, variants, and floating labels
- **Select**: Searchable dropdown with filtering capabilities
- **Switch**: Toggle switch component

### Display Components
- **Typography**: Unified text component for headings and content
- **Badge**: Status indicators with color variants
- **Icon**: React-icons integration with theme-aware styling
- **ProgressBar**: Linear progress indicators with animations
- **CircularProgress**: Circular progress indicators

### Advanced Components
- **TreeView**: Hierarchical data display with icons and interactions
- **Data**: Table component with sorting and Genie integration  
- **Editor**: MDX editor with full theme integration and toolbar
- **FloatingActionButton**: Draggable FAB with smart positioning
- **Genie**: Context-aware popover/tooltip system

## 💫 Special Features

### Genie System
A sophisticated interaction system that provides context-aware popovers, tooltips, and floating cards:
- **Smart Positioning**: Automatically adjusts based on screen position
- **Multiple Triggers**: Click, hover, manual control
- **Theme Aware**: Inherits styling from current theme
- **Corner Detection**: Optimizes positioning based on trigger location

### Layout System
Advanced container layouts supporting:
- **Flex Layouts**: Row, column, wrap variants
- **Grid Layouts**: 1-12 column responsive grids
- **Multi-column**: CSS multi-column layout support
- **Positioned**: Absolute/relative positioning with alignment

### FloatingActionButton (FAB)
- **Draggable Interface**: Smooth drag interactions with snap-to-edge
- **Smart Positioning**: Corner detection and optimal placement
- **Theme Integration**: Inherits colors and styling from current theme
- **Genie Integration**: Built-in popover support

## 🖥️ Component Demo

The main demo page (`/`) showcases all components with:

### Interactive Examples
- **Live Theme Switching**: See instant theme changes across all components
- **Component Playground**: Interactive examples of every component
- **Layout Demonstrations**: All layout types with live examples
- **Form Validation**: Input validation with real-time feedback

### Featured Sections
1. **Theme System Demo**: Theme switcher with color palette display
2. **Typography Showcase**: All text styles and font weights
3. **Button Examples**: All button variants and states
4. **Form Components**: Inputs, selects, switches with validation
5. **Progress Indicators**: Linear and circular progress components
6. **Data Visualization**: TreeView with different data structures
7. **Rich Text Editor**: MDX editor with full feature set
8. **Floating Elements**: FAB and Genie system demonstrations

    { params: { token: authToken } }
);
```

## 🛠️ Development

### Project Structure
```
src/
├── client/              # API clients for backend integration
│   ├── app.client.js    # Shared Axios instance
│   ├── auth.client.js   # Authentication API
│   ├── user.client.js   # User management API
│   ├── file.client.js   # File operations API
│   └── cache.client.js  # Cache management API
├── components/          # All UI components
│   ├── styles/          # Component-specific CSS
│   ├── Button.jsx       # Button component
│   ├── Card.jsx         # Card component
│   └── ...              # Other components
├── contexts/            # React contexts
│   ├── AuthContext.jsx  # Authentication state
│   ├── ThemeContext.jsx # Theme management
│   └── NotificationContext.jsx # Notifications
├── pages/               # Application pages
│   ├── ComponentDemo.jsx    # Component showcase
│   ├── LoginPage.jsx        # Login page
│   ├── SignupPage.jsx       # Registration page
│   ├── FilesPage.jsx        # File management
│   └── AdminPage.jsx        # Admin dashboard
├── styles/
│   ├── global.css       # Global styles and reset
│   └── themes/          # Theme CSS files
└── utils/               # Utility functions
```

### Adding New Components
1. **Create Component File**: `src/components/NewComponent.jsx`
2. **Add CSS Styles**: `src/components/styles/NewComponent.css`
3. **Import Styles**: Add import to `src/components/styles/components.css`
4. **Export Component**: Add to `src/components/Components.jsx`
5. **Use CSS Variables**: Reference theme colors via CSS custom properties

### Creating Custom Themes
1. **Create Theme File**: `src/styles/themes/mytheme.css`
2. **Define CSS Variables**: Follow existing theme structure
3. **Add to Context**: Register in `src/contexts/ThemeContext.jsx`
4. **Import Fonts**: Add Google Fonts imports if needed

### CSS Variable System
Themes use CSS custom properties for dynamic styling:
```css
.theme-modern {
  --primary-color: #3F84E5;
  --secondary-color: #F45D01;
  --background-color: #ffffff;
  /* ... more variables */
}
```

Components reference these variables:
```css
.button.themed-button-primary {
  background-color: var(--primary-color);
  color: var(--primary-contrast-color);
}
```

## 🎯 Usage Examples

### Basic Component Usage
```jsx
import { Button, Card, Typography, Container } from '@components/Components';

function MyComponent() {
  return (
    <Container layout="flex-column" gap="lg">
      <Card padding="lg">
        <Typography as="h2" color="primary">Welcome</Typography>
        <Typography as="p" color="muted">
          This card uses the current theme automatically
        </Typography>
        <Button variant="primary" size="lg">
          Get Started
        </Button>
      </Card>
    </Container>
  );
}
```

### Theme Management
```jsx
import { useTheme } from '@contexts/ThemeContext';

function ThemeSwitcher() {
  const { currentTheme, switchTheme, availableThemes } = useTheme();
  
  return (
    <ButtonGroup>
      {availableThemes.map(theme => (
        <Button 
          key={theme}
          variant={currentTheme === theme ? "primary" : "secondary"}
          onClick={() => switchTheme(theme)}
        >
          {theme}
        </Button>
      ))}
    </ButtonGroup>
  );
}
```

### Advanced Layout System
```jsx
function DashboardLayout() {
  return (
    <Page layout="grid" columns={3} gap="lg">
      <Card layout="flex-column" gap="md">
        <Typography as="h3">Stats Card</Typography>
        <CircularProgress value={75} variant="success" />
      </Card>
      
      <Card layout="flex" justify="between" align="center">
        <Typography as="h4">Actions</Typography>
        <FloatingActionButton 
          variant="primary"
          genie={{
            content: "Quick actions menu",
            trigger: 'click'
          }}
        />
      </Card>
      
      <Card>
        <TreeView 
          data={navigationData}
          variant="compact"
          backgroundColor="transparent"
        />
      </Card>
    </Page>
  );
}
```

### Form with Validation
```jsx
function ContactForm() {
  const [formData, setFormData] = useState({});
  
  return (
    <Container layout="flex-column" gap="md">
      <Input
        label="Email Address"
        type="email"
        variant="floating"
        validate={true}
        required={true}
        onChange={(value) => setFormData({...formData, email: value})}
      />
      
      <Select
        label="Department"
        options={[
          { value: 'sales', label: 'Sales' },
          { value: 'support', label: 'Support' }
        ]}
        variant="outline"
        required={true}
      />
      
      <Switch
        label="Subscribe to newsletter"
        checked={formData.newsletter}
        onChange={(checked) => setFormData({...formData, newsletter: checked})}
      />
      
      <Button variant="primary" size="lg" width="100%">
        Submit Form
      </Button>
    </Container>
  );
}
```

### Rich Text Editing
```jsx
function BlogEditor() {
  const [content, setContent] = useState('');
  
  return (
    <Card>
      <Typography as="h3" marginBottom="md">Write Your Post</Typography>
      <Editor
        value={content}
        onChange={setContent}
        placeholder="Start writing..."
        showDiff={true}
        theme="current" // Uses current app theme
      />
    </Card>
  );
}
```

## 📱 Responsive Design

The application is built with a mobile-first responsive approach:

### Breakpoints
- **Mobile**: ≤480px
- **Tablet**: 481px - 768px  
- **Desktop**: 769px - 1024px
- **Large Desktop**: 1025px - 1499px
- **Extra Large**: ≥1500px

### Responsive Features
- **Fluid Grid System**: Components adapt to screen size
- **Scalable Typography**: Font sizes adjust per breakpoint
- **Touch-Friendly**: Mobile-optimized touch targets
- **Adaptive Layouts**: Layout types change based on screen size

## 🚀 Production Build

### Building for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Deployment Considerations
- **Theme CSS**: All theme files are pre-loaded for instant switching
- **Font Loading**: Google Fonts are imported per theme
- **Bundle Size**: Tree-shaking removes unused components
- **Performance**: CSS custom properties provide efficient theme switching

## 📦 Building for Production

### Build Process

```bash
# Create production build
npm run build

# Preview production build locally
npm run preview
```

The build output will be in `dist/` directory.

### Deployment Options

**Static Hosting** (Recommended):
- **Vercel**: `vercel deploy`
- **Netlify**: Drag & drop `dist/` folder or connect GitHub repo
- **AWS S3 + CloudFront**: Upload `dist/` contents
- **GitHub Pages**: Deploy `dist/` to gh-pages branch

**Important**: Update the API base URL for production:

```javascript
// src/client/app.client.js
export const API_BASE_URL = 'https://your-api-domain.com/api/v1';
```

### Environment-specific Configuration

```javascript
// src/client/app.client.js
export const API_BASE_URL = import.meta.env.PROD 
    ? 'https://your-api-domain.com/api/v1'
    : 'http://localhost:8090/api/v1';
```

## 🔧 Troubleshooting

### Backend Connection Issues
1. **Check server is running**: `http://localhost:8090/api/v1/health`
2. **CORS errors**: Verify `ALLOWED_ORIGINS` in server `.env` includes frontend URL
3. **Network errors**: Check API_BASE_URL in `src/client/app.client.js`

### Authentication Issues
1. **Clear cookies**: Delete browser cookies and try logging in again
2. **Token expired**: Logout and login again to refresh tokens
3. **CORS credentials**: Ensure `withCredentials: true` in Axios config

### Theme Not Loading
1. Check browser console for CSS import errors
2. Verify theme file exists in `src/styles/themes/`
3. Ensure theme is registered in `ThemeContext.jsx`

### Component Styling Issues  
1. Check if CSS file is imported in `components.css`
2. Verify CSS custom properties are defined in theme
3. Use browser dev tools to inspect CSS variables

### Development Server Issues
1. Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
2. Clear browser cache and localStorage
3. Check port 8088 is not in use by another application
4. Verify Vite config in `vite.config.js`

## 🤝 Contributing

Contributions are welcome! The architecture can be adapted for production applications requiring:
- Dynamic theme switching
- Consistent design systems  
- Component libraries with theme support
- Responsive, mobile-first design
- Backend integration with authentication

## 📄 License

See [LICENSE.md](./LICENSE.md) for license information.

---

**Start exploring**: Run `npm run dev` and visit `http://localhost:8098` to see all components and themes in action!
