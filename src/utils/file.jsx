import { Typography, Badge } from '@components/Components';

/**
 * Field type configuration for data display
 * 
 * This configuration provides consistent styling for field rendering across
 * the application. Each field type defines:
 * - component: The React component used to render the field
 * - props: Default props for the component
 * - priority: Display priority (1=highest, 3=lowest)
 * - transform: Optional function to transform the raw value
 */

export const fieldStyleConfig = {
  title: { 
    component: Typography, 
    props: { as: 'h3', weight: 'bold', size: 'sm' }
  },
  id: { 
    component: Typography, 
    props: { as: 'span', size: 'xs' },
    priority: 1, // Changed to priority 1 to be shown first
    transform: (value) => ({ children: `#${value}` })
  },
  assignee: { 
    component: Typography, 
    props: { as: 'p', weight: 'medium', size: 'xs' },
  },
  status: { 
    component: Badge, 
    props: { size: 'small' },
    transform: (value) => ({
      variant: value === 'Active' ? 'success' : 
               value === 'Inactive' ? 'error' : 'default',
      children: value
    })
  },
  priority: { 
    component: Badge, 
    props: { size: 'small' },
    transform: (value) => ({
      variant: value === 'High' ? 'error' : 
               value === 'Medium' ? 'warning' : 'success',
      children: value
    })
  },
  role: { 
    component: Badge, 
    props: { size: 'small', variant: 'info' }
  },
  category: { 
    component: Badge, 
    props: { size: 'small', variant: 'tertiary' }
  },
  dueDate: { 
    component: Typography, 
    props: { as: 'span', size: 'sm', color: 'warning' },
    transform: (value) => {
      const date = new Date(value);
      const now = new Date();
      const isOverdue = date < now;
      return {
        color: isOverdue ? 'error' : 'warning',
        children: date.toLocaleDateString()
      };
    }
  },
  
  // Tertiary fields (priority 3) - Additional details and supplementary info
  description: { 
    component: Typography, 
    props: { as: 'p', size: 'sm', color: 'primary' },
    priority: 3,
    truncate: true,
    maxLength: 100
  },
  email: { 
    component: Typography, 
    props: { as: 'a', size: 'sm', color: 'info' },
    priority: 3,
    transform: (value) => ({ href: `mailto:${value}`, children: value })
  },
  department: { 
    component: Typography, 
    props: { as: 'span', size: 'xs' },
    priority: 3
  },
  joinDate: { 
    component: Typography, 
    props: { as: 'span', size: 'xs' },
    priority: 3,
    transform: (value) => ({
      children: `Joined: ${new Date(value).toLocaleDateString()}`
    })
  },
  salary: { 
    component: Typography, 
    props: { as: 'span', size: 'sm', weight: 'medium', color: 'success' },    priority: 3
  }
};
