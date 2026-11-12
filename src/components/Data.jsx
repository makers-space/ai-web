import React, { forwardRef, useCallback, useMemo, useRef, useState } from 'react';
import { ThemeProvider, useTheme } from '@contexts/ThemeContext';
import Card from './Card';
import Container from './Container';
import Select from './Select';
import Typography from './Typography';
import ButtonGroup from './ButtonGroup';
import Button from './Button';
import Input from './Input';
import Icon from './Icon';
import { useGeniePortal } from './Genie';
import './styles/Data.css';

/**
 * Data - Flexible data display component with multiple variants
 *
 * Features:
 * - Multiple display variants: table, cards, list
 * - Responsive design with automatic fallbacks
 * - Field configuration-based rendering
 * - Internal sorting with dropdown selector (enabled by default)
 * - Filtering and search capabilities
 * - Pagination support
 * - Field exclusion support (exclude prop)
 * - Full theme integration
 * - Genie integration for all variants (table, cards, list):
 *   - Supports click and contextmenu triggers (hover reserved for field-level complex data)
 *   - Trigger container: table row (<tr>) for table variant, card item or list item for others
 *   - Content can be static or a function that receives (item, rowIndex)
 *   - Callbacks available for show/hide events with item context
 *   - Table variant: Genie attaches to the entire row, positioned based on row location
 */
export const Data = forwardRef(({
    data = [],
    fieldConfig = {},
    variant = 'table', // 'table', 'cards', 'list'
    className = '',
    size = 'sm', // 'xxs', 'xs', 'sm', 'md', 'lg', 'xl' - Controls size of all nested components
    sortable = true, // Default to true for new sorting functionality
    maxColumns = 6, // Maximum columns to show before condensing (table variant)
    exclude = [], // Array of field names to exclude from display and filters
    // Remove Data-specific props that shouldn't be passed to DOM
    searchable,
    filterable,
    paginated,
    pageSize: propPageSize,
    cardColumns,
    cardGap,
    cardPadding,
    selector = false, // Enable row selection with checkboxes
    onSelectionChange = null, // Optional callback when selection changes: (selectedItems, selectedIds) => {}
    selectedItems = null, // Optional controlled selection - array of selected item IDs or items
    theme = null, // Optional theme override
    width = null, // Width value (e.g., '100%', '200px', 'auto')
    height = null, // Height value (e.g., '2rem', '32px', 'auto')
    minWidth = null, // Minimum width (e.g., '100px', '5rem')
    minHeight = null, // Minimum height (e.g., '2rem', '32px')
    maxWidth = null, // Maximum width (e.g., '500px', '100%')
    maxHeight = null, // Maximum height (e.g., '10rem', '200px')
    marginTop = null, // Margin top: 'none', 'xs', 'sm', 'md', 'lg', 'xl' or custom value
    marginBottom = null, // Margin bottom: 'none', 'xs', 'sm', 'md', 'lg', 'xl' or custom value
    justifySelf = null, // CSS justify-self property: 'auto', 'start', 'end', 'center', 'stretch'
    // Generic Genie integration props
    genie = null, // Genie configuration object: { content, variant, trigger, position, etc. }
    onGenieShow = null, // Callback when Genie is shown
    onGenieHide = null, // Callback when Genie is hidden
    ...props
}, ref) => {
        const {currentTheme: globalTheme} = useTheme();

        // Use theme prop if provided, otherwise use effective theme from context
        const dataTheme = theme || globalTheme;

        // State management
        const [currentVariant, setCurrentVariant] = useState(variant);
        const [sortField, setSortField] = useState(null);
        const [sortDirection, setSortDirection] = useState('asc');
        const [globalSearch, setGlobalSearch] = useState('');
        const [showColumnFilters, setShowColumnFilters] = useState(false);
        const [columnFilters, setColumnFilters] = useState({});
        const [visibleColumns, setVisibleColumns] = useState({});
        const [page, setPage] = useState(1);
        const [pageSize, setPageSize] = useState(propPageSize || 10);

        // Selection state management - simplified
        const [internalSelectedItems, setInternalSelectedItems] = useState([]);
        const isControlledSelection = selectedItems !== null;
        const currentSelectedItems = isControlledSelection ? selectedItems : internalSelectedItems;

        // Size mapping helpers - derive smaller/larger sizes from main size prop
        const getSmallerSize = (baseSize) => {
            const sizeMap = { xl: 'lg', lg: 'md', md: 'sm', sm: 'xs', xs: 'xxs', xxs: 'xxs' };
            return sizeMap[baseSize] || 'xxs';
        };

        const getTypographySize = () => size; // Typography uses main size
        const getIconSize = () => getSmallerSize(size); // Icons one size smaller
        const getButtonSize = () => size; // Buttons use main size
        const getInputSize = () => size; // Inputs use main size

        // Get fields to display - use JSON order, not priority-based
        const getDisplayFields = () => {
            if (!data.length) return [];

            // Get all unique fields from data in the order they appear in the first item
            const firstItem = data[0];
            const fieldsFromFirst = Object.keys(firstItem);

            // Add any additional fields from other items that might not be in the first
            const allFields = [...new Set([
                ...fieldsFromFirst,
                ...data.flatMap(item => Object.keys(item))
            ])];

            // Filter out excluded fields from display
            return allFields.filter(field => !exclude.includes(field));
        };

        // Get all fields for filtering and searching (includes excluded fields)
        const getAllFields = () => {
            if (!data.length) return [];

            // Get all unique fields from data in the order they appear in the first item
            const firstItem = data[0];
            const fieldsFromFirst = Object.keys(firstItem);

            // Add any additional fields from other items that might not be in the first
            const allFields = [...new Set([
                ...fieldsFromFirst,
                ...data.flatMap(item => Object.keys(item))
            ])];

            return allFields;
        };

        // Helper function to detect timestamp/date fields
        const isTimestampField = (field, data) => {
            if (!data.length) return false;

            // Get sample values to analyze
            const sampleValues = data.slice(0, 10).map(item => item[field]).filter(val => val != null);
            if (sampleValues.length === 0) return false;

            // Check if values match common timestamp formats
            const timestampFormatPatterns = [
                /^\d{4}-\d{2}-\d{2}/, // ISO date: 2023-12-25, 2023-12-25T10:30:00
                /^\d{4}\/\d{2}\/\d{2}/, // US date: 2023/12/25
                /^\d{2}\/\d{2}\/\d{4}/, // US date: 12/25/2023
                /^\d{2}-\d{2}-\d{4}/, // EU date: 25-12-2023
                /^\d{1,2}\/\d{1,2}\/\d{2,4}/, // Flexible date: 1/1/23, 12/25/2023
                /^\d{10,13}$/, // Unix timestamp (seconds or milliseconds)
                /T\d{2}:\d{2}:\d{2}/, // Contains time portion: ...T10:30:00
                /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // Full ISO: 2023-12-25T10:30:00
            ];

            // Check if most values match timestamp patterns and are valid dates
            const matchingValues = sampleValues.filter(val => {
                if (typeof val !== 'string' && typeof val !== 'number') return false;

                const stringVal = String(val);
                const hasTimestampFormat = timestampFormatPatterns.some(pattern => pattern.test(stringVal));

                // Also verify it's a valid date
                const date = new Date(val);
                const isValidDate = !isNaN(date.getTime());

                return hasTimestampFormat && isValidDate;
            });

            // If 80% or more of the sample values look like timestamps, treat as timestamp field
            const timestampRatio = matchingValues.length / sampleValues.length;
            return timestampRatio >= 0.8;
        };

        const displayFields = getDisplayFields();
        const allFields = getAllFields();

        const getJustifySelfClass = () => {
            if (justifySelf) {
                return `justify-self-${justifySelf}`;
            }
            return '';
        };

        // Initialize visible columns state
        React.useEffect(() => {
            if (displayFields.length > 0) {
                setVisibleColumns(prev => {
                    const initialVisibility = {};
                    displayFields.forEach(field => {
                        // Keep existing value if it exists, otherwise default to true
                        initialVisibility[field] = prev[field] !== undefined ? prev[field] : true;
                    });
                    return initialVisibility;
                });
            }
        }, [displayFields.length]);
        // Get visible fields based on user selection
        const visibleFields = displayFields.filter(field => visibleColumns[field]);

        // Get unique values for a field for filtering
        const getUniqueFieldValues = useCallback((field) => {
            if (!data || data.length === 0) return [];
            const values = [...new Set(data.map(item => item[field]).filter(value => value !== null && value !== undefined && value !== ''))];
            return values.sort((a, b) => String(a).localeCompare(String(b)));
        }, [data]);

        // Get unique values for all fields
        const fieldOptions = useMemo(() => {
            const options = {};
            allFields.forEach(field => {
                options[field] = getUniqueFieldValues(field);
            });
            return options;
        }, [allFields, getUniqueFieldValues]);

        // Filter and search data with internal sorting
        const filteredData = useMemo(() => {
            let filtered = [...data];

            // Apply global search
            if (globalSearch && globalSearch.trim() !== '') {
                const searchTerm = globalSearch.trim().toLowerCase();
                filtered = filtered.filter(item =>
                    allFields.some(field => {
                        const value = item[field];
                        return value !== null && value !== undefined && value !== '' &&
                            String(value).toLowerCase().includes(searchTerm);
                    })
                );
            }  // Apply column filters
            Object.keys(columnFilters).forEach(field => {
                const filterValue = columnFilters[field];

                // Handle date range filters
                if (filterValue && typeof filterValue === 'object' && (filterValue.from || filterValue.to)) {
                    const {from, to} = filterValue;

                    filtered = filtered.filter(item => {
                        const value = item[field];
                        if (value === null || value === undefined || value === '') return false;

                        const itemDate = new Date(value);
                        if (isNaN(itemDate.getTime())) return false;

                        // Check from date
                        if (from) {
                            const fromDate = new Date(from);
                            if (itemDate < fromDate) return false;
                        }

                        // Check to date (inclusive - end of day)
                        if (to) {
                            const toDate = new Date(to);
                            toDate.setHours(23, 59, 59, 999); // End of day
                            if (itemDate > toDate) return false;
                        }

                        return true;
                    });
                }
                // Handle regular text/select filters
                else if (filterValue && filterValue.trim && filterValue.trim() !== '') {
                    const options = fieldOptions[field] || [];
                    const hasLimitedOptions = options.length > 0 && options.length <= 20;

                    filtered = filtered.filter(item => {
                        const value = item[field];
                        if (value === null || value === undefined || value === '') return false;

                        const stringValue = String(value);
                        const stringFilter = String(filterValue).trim();

                        // If we have limited options and the filter value is one of them, do exact match
                        if (hasLimitedOptions && options.some(option => String(option) === stringFilter)) {
                            return stringValue === stringFilter;
                        }

                        // Otherwise, do partial match (case-insensitive)
                        return stringValue.toLowerCase().includes(stringFilter.toLowerCase());
                    });
                }
            });

            // Apply sorting if configured
            if (sortable && sortField && sortDirection) {
                filtered.sort((a, b) => {
                    const aVal = a[sortField];
                    const bVal = b[sortField];

                    // Handle null/undefined values (always sort to end)
                    if (aVal == null && bVal == null) return 0;
                    if (aVal == null) return 1;
                    if (bVal == null) return -1;

                    // Compare values based on type
                    let comparison = 0;
                    if (typeof aVal === 'string' && typeof bVal === 'string') {
                        comparison = aVal.localeCompare(bVal, undefined, {numeric: true, sensitivity: 'base'});
                    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
                        comparison = aVal - bVal;
                    } else if (aVal instanceof Date && bVal instanceof Date) {
                        comparison = aVal.getTime() - bVal.getTime();
                    } else {
                        // Fallback to string comparison
                        comparison = String(aVal).localeCompare(String(bVal), undefined, {
                            numeric: true,
                            sensitivity: 'base'
                        });
                    }

                    return sortDirection === 'desc' ? -comparison : comparison;
                });
            }

            return filtered;
        }, [data, globalSearch, columnFilters, allFields, fieldOptions, sortable, sortField, sortDirection]);

        // Update pagination based on filtered data
        const totalFilteredRows = filteredData.length;
        const totalFilteredPages = Math.max(1, Math.ceil(totalFilteredRows / pageSize));
        const paginatedFilteredData = filteredData.slice((page - 1) * pageSize, page * pageSize);

        // Reset page when filters change
        React.useEffect(() => {
            setPage(1);
        }, [globalSearch, columnFilters]);

        // Helper function to check if a value is a complex object/array
        const isComplexValue = (value) => {
            if (value === null || value === undefined) return false;
            if (typeof value === 'object') {
                if (Array.isArray(value)) {
                    return value.length > 0 && (value.length > 1 || typeof value[0] === 'object');
                }
                return Object.keys(value).length > 0;
            }
            return false;
        };

        // Helper function to get the first/preview value from complex data
        const getPreviewValue = (value) => {
            if (!isComplexValue(value)) return String(value);

            if (Array.isArray(value)) {
                if (value.length === 0) return '[]';
                // Return the first value, even if it's an object
                const firstValue = value[0];
                if (typeof firstValue === 'object') {
                    // If first element is an object, show the first property key:value
                    const keys = Object.keys(firstValue);
                    if (keys.length > 0) {
                        return `${keys[0]}: ${String(firstValue[keys[0]])}`;
                    }
                    return '{}';
                }
                return String(firstValue);
            }

            if (typeof value === 'object') {
                const keys = Object.keys(value);
                if (keys.length === 0) return '{}';
                // Return the first property as key:value
                const firstKey = keys[0];
                const firstValue = value[firstKey];
                return `${firstKey}: ${String(firstValue)}`;
            }

            return String(value);
        };

        // Helper function to format complex data for Genie display
        const formatComplexData = (value) => {
            return (
                <Container className="json-preview" padding="none">
                    {JSON.stringify(value, null, 2)}
                </Container>
            );
        };

        // Render field value using field configuration with nested data support
        const renderFieldValue = (item, field, triggerRef = null) => {
            const value = item[field];
            // Only return null for null, undefined, or empty strings - allow false/0 values
            if (value === null || value === undefined || value === '') return null;

            const config = fieldConfig[field];
            const hasComplexData = isComplexValue(value);

            if (!config) {
                // Handle complex data with Genie using hover trigger
                if (hasComplexData && triggerRef) {
                    return (
                        <Container
                            layout="flex"
                            align="center"
                            gap="xs"
                            padding="none"
                            genie={{
                                content: formatComplexData(value),
                                trigger: 'hover',
                                variant: 'popover'
                            }}
                        >
                            <Typography as="span" size={getTypographySize()}>{getPreviewValue(value)}</Typography>
                            <Icon name="FiEye" size={getIconSize()}/>
                        </Container>
                    );
                }
                return <Typography as="span" size={getTypographySize()}>{String(value)}</Typography>;
            }

            const Component = config.component;
            // Label-only fieldConfig entries fall back to default rendering
            if (!Component) {
                return <Typography as="span" size={getTypographySize()}>{String(value)}</Typography>;
            }
            let componentProps = {...config.props};

            // Remove any size prop from fieldConfig - parent Data component's size prop takes precedence
            delete componentProps.size;

            // Apply transform if available
            if (config.transform) {
                const transformedProps = config.transform(value);
                componentProps = {...componentProps, ...transformedProps};
                // Also remove size from transformed props
                delete componentProps.size;
            } else {
                componentProps.children = hasComplexData ? getPreviewValue(value) : value;
            }

            // Apply truncation for long text
            if (config.truncate && config.maxLength && typeof value === 'string' && value.length > config.maxLength) {
                componentProps.children = value.substring(0, config.maxLength) + '...';
                componentProps.title = value;
            }

            // Handle complex data with configured component
            if (hasComplexData && triggerRef) {
                return (
                    <Container
                        layout="flex"
                        align="center"
                        gap="xs"
                        padding="none"
                        genie={{
                            content: formatComplexData(value),
                            trigger: 'hover',
                            variant: 'popover'
                        }}
                    >
                        <Component {...componentProps} size={getTypographySize()} />
                        <Icon name="FiEye" size={getIconSize()}/>
                    </Container>
                );
            }

            return <Component {...componentProps} size={getTypographySize()} />;
        };

        // Handle sort field and direction change
        const handleSortChange = (sortValue) => {
            if (!sortValue || sortValue === 'none') {
                setSortField(null);
                setSortDirection('asc');
                return;
            }

            const [field, direction] = sortValue.split('-');
            setSortField(field);
            setSortDirection(direction || 'asc');
        };

        // Get sort options for select dropdown
        const getSortOptions = () => {
            const options = [
                {value: 'none', label: 'No sorting'}
            ];

            displayFields.forEach(field => {
                const fieldName = formatFieldName(field);
                options.push(
                    {value: `${field}-asc`, label: `${fieldName} ↑`},
                    {value: `${field}-desc`, label: `${fieldName} ↓`}
                );
            });

            return options;
        };

        // Get current sort value for select
        const getCurrentSortValue = () => {
            if (!sortField) return 'none';
            return `${sortField}-${sortDirection}`;
        };

        // Format field name for display
        const formatFieldName = (field) => {
            return field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1');
        };

        // Handle column filter change
        const handleColumnFilterChange = (field, value) => {
            setColumnFilters(prev => ({
                ...prev,
                [field]: value
            }));
        };

        // Handle date range filter changes
        const handleDateRangeChange = (field, type, value) => {
            setColumnFilters(prev => ({
                ...prev,
                [field]: {
                    ...prev[field],
                    [type]: value
                }
            }));
        };

        // Handle column visibility toggle
        const handleColumnVisibilityChange = (field, visible) => {
            setVisibleColumns(prev => ({
                ...prev,
                [field]: visible !== undefined ? visible : !prev[field]
            }));
        };

        // Selection management functions - optimized
        const getItemId = (item, index) => {
            return item?.id || item?._id || index;
        };

        // Create a Set of selected IDs for O(1) lookup performance
        const selectedIds = useMemo(() => {
            return new Set(currentSelectedItems.map((item, idx) =>
                typeof item === 'object' ? getItemId(item, idx) : item
            ));
        }, [currentSelectedItems]);

        const isItemSelected = (item, index) => {
            return selectedIds.has(getItemId(item, index));
        };

        // Consolidated selection update helper
        const updateSelection = (newSelectedItems) => {
            if (!isControlledSelection) {
                setInternalSelectedItems(newSelectedItems);
            }
            if (onSelectionChange) {
                const selectedIds = newSelectedItems.map((item, idx) =>
                    typeof item === 'object' ? getItemId(item, idx) : item
                );
                onSelectionChange(newSelectedItems, selectedIds);
            }
        };

        const handleItemSelection = (item, index, checked) => {
            const itemId = getItemId(item, index);

            let newSelectedItems;
            if (checked) {
                newSelectedItems = [...currentSelectedItems, item];
            } else {
                newSelectedItems = currentSelectedItems.filter(selectedItem => {
                    const selectedId = typeof selectedItem === 'object' ? getItemId(selectedItem, -1) : selectedItem;
                    return selectedId !== itemId;
                });
            }

            updateSelection(newSelectedItems);
        };

        const handleSelectAll = (checked) => {
            if (checked) {
                // Add unselected items from current page
                const unselectedItems = paginatedFilteredData.filter((item, index) =>
                    !isItemSelected(item, index + (page - 1) * pageSize)
                );
                updateSelection([...currentSelectedItems, ...unselectedItems]);
            } else {
                // Remove current page items from selection
                const currentPageIds = new Set(paginatedFilteredData.map((item, index) =>
                    getItemId(item, index + (page - 1) * pageSize)
                ));
                const remainingItems = currentSelectedItems.filter(selectedItem => {
                    const selectedId = typeof selectedItem === 'object' ? getItemId(selectedItem, -1) : selectedItem;
                    return !currentPageIds.has(selectedId);
                });
                updateSelection(remainingItems);
            }
        };

        const getSelectAllState = () => {
            const currentPageItems = paginatedFilteredData;
            if (currentPageItems.length === 0) return false;

            const selectedCount = currentPageItems.filter((item, index) =>
                isItemSelected(item, index + (page - 1) * pageSize)
            ).length;

            if (selectedCount === 0) return false;
            if (selectedCount === currentPageItems.length) return 'all';
            return 'some';
        };

        // Internal component for rendering a table cell
        const TableCell = ({item, field, rowIndex}) => {
            const cellRef = useRef(null);

            return (
                <td className="table-cell">
                    <Container ref={cellRef} className="table-cell-content" padding="md">
                        {renderFieldValue(item, field, cellRef)}
                    </Container>
                </td>
            );
        };

        // Internal component for rendering a table row
        const TableRow = ({item, rowIndex}) => {
            const rowRef = useRef(null);

            // Prepare generic genie configuration if provided
            const rowGenieConfig = genie ? {
                ...genie,
                // Pass item data to genie content if it's a function
                content: typeof genie.content === 'function' ? genie.content(item, rowIndex) : genie.content,
                trigger: genie.trigger === 'hover' ? 'click' : genie.trigger || 'click', // Force click/contextmenu only
            } : null;

            // Use the simplified portal hook
            const {triggerProps, GeniePortal} = useGeniePortal(
                rowGenieConfig,
                rowRef,
                () => onGenieShow?.(item, rowIndex),
                () => onGenieHide?.(item, rowIndex)
            );

            return (
                <>
                    <tr
                        ref={rowRef}
                        className={`table-row ${rowGenieConfig ? 'genie-trigger' : ''}`}
                        {...triggerProps}
                    >
                        {selector && (
                            <td className="table-cell">
                                <Container padding="md">
                                    <Input
                                        type="checkbox"
                                        checked={isItemSelected(item, rowIndex)}
                                        onChange={(e) => handleItemSelection(item, rowIndex, e.target.checked)}
                                        size={getInputSize()}
                                    />
                                </Container>
                            </td>
                        )}
                        {visibleFields.map(field => (
                            <TableCell
                                key={`${item.id || rowIndex}-${field}`}
                                item={item}
                                field={field}
                                rowIndex={rowIndex}
                            />
                        ))}
                    </tr>
                    {/* Render Genie using Portal */}
                    {GeniePortal}
                </>
            );
        };

        // Render different variants
        const renderTableVariant = () => {
            const selectAllState = selector ? getSelectAllState() : false;

            return (
                <Container className="data-item-container">
                    <table className="themed-table">
                        <thead className="table-header">
                        <tr>
                            {selector && (
                                <th className="table-header-cell">
                                    <Input
                                        type="checkbox"
                                        checked={selectAllState === 'all'}
                                        indeterminate={selectAllState === 'some'}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                        size={getButtonSize()}
                                    />
                                </th>
                            )}
                            {visibleFields.map(field => (
                                <th
                                    key={field}
                                    className="table-header-cell"
                                >
                                    <Typography as="span" weight="semibold" size={getTypographySize()}>
                                        {formatFieldName(field)}
                                    </Typography>
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody className="table-body">
                        {paginatedFilteredData.map((item, index) => (
                            <TableRow
                                key={item.id || index}
                                item={item}
                                rowIndex={index + (page - 1) * pageSize}
                            />
                        ))}
                        </tbody>
                    </table>
                </Container>
            );
        };

        const renderCardsVariant = () => {
            return (
                <Container
                    layout="grid"
                    columns="auto"
                    gap="lg"
                    className="data-item-container"
                >
                    {paginatedFilteredData.length === 0 ? (
                        <Card padding="lg">
                            <Typography size={getTypographySize()}>No data available</Typography>
                        </Card>
                    ) : (
                        paginatedFilteredData.map((item, index) => {
                            const CardComponent = ({item, index}) => {
                                const rowIndex = index + (page - 1) * pageSize;
                                const cardRef = useRef(null);

                                // Prepare generic genie configuration if provided
                                const cardGenieConfig = genie ? {
                                    ...genie,
                                    // Pass item data to genie content if it's a function
                                    content: typeof genie.content === 'function' ? genie.content(item, rowIndex) : genie.content,
                                    trigger: genie.trigger === 'hover' ? 'click' : genie.trigger || 'click', // Force click/contextmenu only
                                } : null;

                                return (
                                    <Card
                                        ref={cardRef}
                                        padding="lg"
                                        className="data-card-item"
                                        genie={cardGenieConfig}
                                        onGenieShow={onGenieShow ? () => onGenieShow(item, rowIndex) : null}
                                        onGenieHide={onGenieHide ? () => onGenieHide(item, rowIndex) : null}
                                    >
                                        {selector ? (
                                            <Container layout="flex" gap="sm" padding="none">
                                                <div>
                                                    <Input
                                                        type="checkbox"
                                                        checked={isItemSelected(item, rowIndex)}
                                                        onChange={(e) => handleItemSelection(item, rowIndex, e.target.checked)}
                                                        size={getButtonSize()}
                                                    />
                                                </div>
                                                <Container layout="flex-column" gap="sm" padding="none" flexFill>
                                                    {visibleFields.map((field) => (
                                                        <Container key={field} layout="flex" gap="sm" align="center"
                                                                   padding="none">
                                                            <Typography weight="medium" size={getIconSize()}
                                                                        style={{minWidth: '80px', flex: '0 0 auto'}}>
                                                                {formatFieldName(field)}:
                                                            </Typography>
                                                            <Container padding="none" flexFill>
                                                                {renderFieldValue(item, field, cardRef)}
                                                            </Container>
                                                        </Container>
                                                    ))}
                                                </Container>
                                            </Container>
                                        ) : (
                                            <Container layout="flex-column" gap="sm" padding="none">
                                                {visibleFields.map((field) => (
                                                    <Container key={field} layout="flex" gap="sm" align="center"
                                                               padding="none">
                                                        <Typography weight="medium" size={getIconSize()}
                                                                    style={{minWidth: '80px', flex: '0 0 auto'}}>
                                                            {formatFieldName(field)}:
                                                        </Typography>
                                                        <Container padding="none" flexFill>
                                                            {renderFieldValue(item, field, cardRef)}
                                                        </Container>
                                                    </Container>
                                                ))}
                                            </Container>
                                        )}
                                    </Card>
                                );
                            };

                            return <CardComponent key={index} item={item} index={index}/>;
                        })
                    )}
                </Container>
            );
        };
        const renderListVariant = () => {
            return (
                <Container layout="flex-column" gap="sm" padding="none" className="data-item-container">
                    {paginatedFilteredData.length === 0 ? (
                        <Card padding="md">
                            <Typography size={getTypographySize()}>No data available</Typography>
                        </Card>
                    ) : (
                        paginatedFilteredData.map((item, index) => {
                            const ListItemComponent = ({item, index}) => {
                                const rowIndex = index + (page - 1) * pageSize;
                                const listItemRef = useRef(null);

                                // Prepare generic genie configuration if provided
                                const listItemGenieConfig = genie ? {
                                    ...genie,
                                    // Pass item data to genie content if it's a function
                                    content: typeof genie.content === 'function' ? genie.content(item, rowIndex) : genie.content,
                                    trigger: genie.trigger === 'hover' ? 'click' : genie.trigger || 'click', // Force click/contextmenu only
                                } : null;

                                return (
                                    <Card
                                        ref={listItemRef}
                                        padding="md"
                                        className="data-list-item"
                                        genie={listItemGenieConfig}
                                        onGenieShow={onGenieShow ? () => onGenieShow(item, rowIndex) : null}
                                        onGenieHide={onGenieHide ? () => onGenieHide(item, rowIndex) : null}
                                    >
                                        {selector ? (
                                            <Container layout="flex" gap="md" align="center" padding="none">
                                                <div>
                                                    <Input
                                                        type="checkbox"
                                                        checked={isItemSelected(item, rowIndex)}
                                                        onChange={(e) => handleItemSelection(item, rowIndex, e.target.checked)}
                                                        size={getButtonSize()}
                                                    />
                                                </div>
                                                <Container layout="flex" justify="wrap" gap="lg" align="center"
                                                           flexFill>
                                                    {visibleFields.map((field, fieldIndex) => (
                                                        <Container key={field} layout="flex-column" gap="xs"
                                                                   padding="none"
                                                                   flexFill={fieldIndex === 0}>
                                                            <Typography weight="medium" size={getIconSize()}>
                                                                {formatFieldName(field)}
                                                            </Typography>
                                                            {renderFieldValue(item, field, listItemRef)}
                                                        </Container>
                                                    ))}
                                                </Container>
                                            </Container>
                                        ) : (
                                            <Container layout="flex" justify="wrap" gap="lg" align="center">
                                                {visibleFields.map((field, fieldIndex) => (
                                                    <Container key={field} layout="flex-column" gap="xs" padding="none"
                                                               flexFill={fieldIndex === 0}>
                                                        <Typography weight="medium" size={getIconSize()}>
                                                            {formatFieldName(field)}
                                                        </Typography>
                                                        {renderFieldValue(item, field, listItemRef)}
                                                    </Container>
                                                ))}
                                            </Container>
                                        )}
                                    </Card>
                                );
                            };

                            return <ListItemComponent key={index} item={item} index={index}/>;
                        })
                    )}
                </Container>
            );
        };

        const renderVariant = () => {
            switch (currentVariant) {
                case 'cards':
                    return renderCardsVariant();
                case 'list':
                    return renderListVariant();
                case 'table':
                default:
                    return renderTableVariant();
            }
        };

        if (!data.length) {
            return (
                <Container
                    ref={ref}
                    className={`table-container table-empty theme-${dataTheme} ${className}`}
                    layout="flex"
                    align="center"
                    justify="center"
                    padding="xl"
                    {...props}
                >
                    <Typography as="p">No data available</Typography>
                </Container>
            );
        }

        const getDataStyle = () => {
            const style = {};

            // Sizing
            if (width !== null) style.width = width;
            if (height !== null) style.height = height;
            if (minWidth !== null) style.minWidth = minWidth;
            if (minHeight !== null) style.minHeight = minHeight;
            if (maxWidth !== null) style.maxWidth = maxWidth;
            if (maxHeight !== null) style.maxHeight = maxHeight;

            // Margins
            if (marginTop !== null) {
                if (marginTop === 'none') {
                    style.marginTop = '0';
                } else if (['xs', 'sm', 'md', 'lg', 'xl'].includes(marginTop)) {
                    style.marginTop = `var(--spacing-${marginTop})`;
                } else {
                    style.marginTop = marginTop;
                }
            }

            if (marginBottom !== null) {
                if (marginBottom === 'none') {
                    style.marginBottom = '0';
                } else if (['xs', 'sm', 'md', 'lg', 'xl'].includes(marginBottom)) {
                    style.marginBottom = `var(--spacing-${marginBottom})`;
                } else {
                    style.marginBottom = marginBottom;
                }
            }

            if (justifySelf !== null) style.justifySelf = justifySelf;

            return style;
        };

        const dataElement = (
            <Card
                ref={ref}
                className={`data-container theme-${dataTheme} ${getJustifySelfClass()} ${className}`}
                data-theme={dataTheme}
                data-theme-source={theme ? 'local' : 'inherited'}
                layout="block"
                style={getDataStyle()}
                {...props}
            >
                {/* Data Header with Search, Filters, and Controls */}
                <Container layout="flex" align="center" justify="between" padding="none">
                    {/* Left side - Search */}
                    <Container layout="flex" gap="md" justify="between" align="center" padding="none" flexFill>
                        {/* Global Search */}
                        <Container justify="start" align="center" padding="none" flexFill>
                            <Input
                                placeholder="Search all columns..."
                                value={globalSearch}
                                onChange={(e) => setGlobalSearch(e.target.value)}
                                size={getButtonSize()}
                                variant="outline"
                                type="search"
                                icon="FaSearch"
                            />
                        </Container>


                        {/* Filter Section */}
                        <Container layout="flex" gap="sm" justify="end" padding="none">
                            {/* Column Filters Toggle */}
                            <Button
                                variant="secondary"
                                size={getButtonSize()}
                                onClick={() => setShowColumnFilters(!showColumnFilters)}
                            >
                                <Icon name="FiFilter" size={getIconSize()}/>
                                Filters
                            </Button>

                            {/* Show/Hide Columns Toggle */}
                            <Button
                                variant="secondary"
                                size={getButtonSize()}
                                genie={
                                    <Container layout="flex-column" gap="sm" padding="md">
                                        <Container layout="flex" align="center" justify="between" padding="none">
                                            <Typography size={getTypographySize()} weight="medium">Select Columns</Typography>
                                            <ButtonGroup spaced selectable={false} justify="start">
                                                <Button
                                                    variant="tertiary"
                                                    size={getButtonSize()}
                                                    onClick={() => {
                                                        const allVisible = {};
                                                        displayFields.forEach(field => {
                                                            allVisible[field] = true;
                                                        });
                                                        setVisibleColumns(allVisible);
                                                    }}
                                                >
                                                    All
                                                </Button>
                                                <Button
                                                    variant="tertiary"
                                                    size={getButtonSize()}
                                                    onClick={() => {
                                                        const allHidden = {};
                                                        displayFields.forEach(field => {
                                                            allHidden[field] = false;
                                                        });
                                                        setVisibleColumns(allHidden);
                                                    }}
                                                >
                                                    None
                                                </Button>
                                            </ButtonGroup>
                                        </Container>
                                        {displayFields.map(column => (
                                            <Container key={column} layout="flex" align="center" gap="sm"
                                                       padding="none">
                                                <Input
                                                    type="checkbox"
                                                    id={`column-${column}`}
                                                    checked={visibleColumns[column] || false}
                                                    onChange={() => handleColumnVisibilityChange(column)}
                                                    className="column-selection-checkbox"
                                                />
                                                <Typography
                                                    as="label"
                                                    htmlFor={`column-${column}`}
                                                    size={getTypographySize()}
                                                    className="column-selection-label"
                                                >
                                                    {fieldConfig[column]?.label || column}
                                                </Typography>
                                            </Container>
                                        ))}
                                    </Container>
                                }
                                genieTrigger="click"
                            >
                                <Icon name="FiColumns" size={getIconSize()}/>
                                Columns
                            </Button>
                        </Container>
                    </Container>

                    {/* Right side - Variant Switcher */}
                    <Container layout="flex" gap="sm" align="center" padding="none">
                        <ButtonGroup size={getButtonSize()}>
                            <Button
                                variant={currentVariant === 'table' ? 'primary' : 'secondary'}
                                size={getButtonSize()}
                                onClick={() => setCurrentVariant('table')}
                            >
                                <Icon name="FiGrid" size={getIconSize()}/>
                                Table
                            </Button>
                            <Button
                                variant={currentVariant === 'cards' ? 'primary' : 'secondary'}
                                size={getButtonSize()}
                                onClick={() => setCurrentVariant('cards')}
                            >
                                <Icon name="FiGrid" size={getIconSize()}/>
                                Cards
                            </Button>
                            <Button
                                variant={currentVariant === 'list' ? 'primary' : 'secondary'}
                                size={getButtonSize()}
                                onClick={() => setCurrentVariant('list')}
                            >
                                <Icon name="FiList" size={getIconSize()}/>
                                List
                            </Button>
                        </ButtonGroup>
                    </Container>
                </Container>

                {/* Column Filters Row - Shows when enabled */}
                {showColumnFilters && (
                    <Container gap="md" padding="md" backgroundColor="surface" marginBottom="sm">
                        <Container layout="flex" align="center" justify="between" padding="none">
                            <Typography as="h4" weight="semibold" size={getTypographySize()}>Column Filters</Typography>
                            <Button
                                variant="secondary"
                                size={getButtonSize()}
                                onClick={() => setColumnFilters({})}
                            >
                                Clear All
                            </Button>
                        </Container>
                        <Container layout="flex" justify="wrap" gap="md" padding="none">
                            {allFields.map(field => {
                                const options = fieldOptions[field] || [];
                                const hasOptions = options.length > 0;
                                const isTimestamp = isTimestampField(field, data);

                                return (
                                    <Container key={field} gap="xs" padding="none">
                                        {isTimestamp ? (
                                            // Date range picker for timestamp fields
                                            <Container layout="flex" gap="xs" align="center" padding="none">
                                                <Input
                                                    type="date"
                                                    label={formatFieldName(field) + ' (Start)'}
                                                    value={columnFilters[field]?.from || ''}
                                                    onChange={(e) => handleDateRangeChange(field, 'from', e.target.value)}
                                                    size={getButtonSize()}
                                                    variant="floating"
                                                />
                                                <Typography size={getIconSize()}>to</Typography>
                                                <Input
                                                    type="date"
                                                    label={formatFieldName(field) + ' (End)'}
                                                    value={columnFilters[field]?.to || ''}
                                                    onChange={(e) => handleDateRangeChange(field, 'to', e.target.value)}
                                                    size={getButtonSize()}
                                                    variant="floating"
                                                />
                                            </Container>
                                        ) : hasOptions && options.length <= 10 ? (
                                            // Use Select for fields with reasonable number of options
                                            <Select
                                                placeholder={`Filter by ${formatFieldName(field)}...`}
                                                value={columnFilters[field] || ''}
                                                onChange={(e) => handleColumnFilterChange(field, e.target.value)}
                                                options={[
                                                    {value: '', label: 'All'},
                                                    ...options.map(option => ({
                                                        value: String(option),
                                                        label: String(option)
                                                    }))
                                                ]}
                                                size={getButtonSize()}
                                            />
                                        ) : (
                                            // Use Input for text search or fields with many options
                                            <Input
                                                placeholder={`Filter ${formatFieldName(field)}...`}
                                                value={columnFilters[field] || ''}
                                                onChange={(e) => handleColumnFilterChange(field, e.target.value)}
                                                size={getButtonSize()}
                                                variant="outline"
                                            />
                                        )}
                                        {hasOptions && options.length > 20 && (
                                            <Typography as="span" size={getIconSize()}>
                                                {options.length} unique values
                                            </Typography>
                                        )}
                                    </Container>
                                );
                            })}
                        </Container>
                    </Container>
                )}

                {/* Data Content */}
                {renderVariant()}

                {/* Table Footer with Pagination and Sort Controls */}
                <Container layout="flex" padding="xs">
                    {/* Left Side: Rows per page with entries count as helper text */}
                    <Container layout="flex" padding="none" flexFill>
                        <Select
                            size={getButtonSize()}
                            value={pageSize.toString()}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setPage(1);
                            }}
                            options={[
                                {value: '5', label: '5'},
                                {value: '10', label: '10'},
                                {value: '20', label: '20'},
                                {value: '50', label: '50'},
                                {value: '100', label: '100'}
                            ]}
                        />

                        {/* Center: Sort by selector */}
                        {sortable && (
                            <Select
                                size={getButtonSize()}
                                value={getCurrentSortValue()}
                                onChange={(e) => handleSortChange(e.target.value)}
                                options={getSortOptions()}
                                placeholder="Sort by..."
                            />
                        )}
                    </Container>

                    {/* Right Side: Pagination Controls */}
                    <Container layout="flex" padding="none" justify="end" flexFill wrap={false}>
                        <ButtonGroup size={getButtonSize()} spaced wrap={false} justify="end">
                            <Button size={getButtonSize()} selected={false} onClick={() => setPage(1)} disabled={page === 1}><Icon
                                name="FiChevronsLeft" size='xs'/></Button>
                            <Button size={getButtonSize()} selected={false} onClick={() => setPage(page - 1)}
                                    disabled={page === 1}><Icon name="FiChevronLeft" size='xs'/></Button>

                            {/* Three page buttons showing current page and adjacent pages */}
                            {(() => {
                                // Calculate which three pages to show
                                let startPage, middlePage, endPage;

                                if (page === 1) {
                                    // First page: show 1, 2, 3
                                    startPage = 1;
                                    middlePage = Math.min(2, totalFilteredPages);
                                    endPage = Math.min(3, totalFilteredPages);
                                } else if (page === totalFilteredPages) {
                                    // Last page: show (last-2), (last-1), last
                                    startPage = Math.max(1, totalFilteredPages - 2);
                                    middlePage = Math.max(1, totalFilteredPages - 1);
                                    endPage = totalFilteredPages;
                                } else {
                                    // Middle pages: show (current-1), current, (current+1)
                                    startPage = page - 1;
                                    middlePage = page;
                                    endPage = page + 1;
                                }

                                const pages = [startPage, middlePage, endPage].filter((p, i, arr) =>
                                    p > 0 && p <= totalFilteredPages && arr.indexOf(p) === i // Remove duplicates and invalid pages
                                );

                                return pages.map(pageNum => (
                                    <Button
                                        key={pageNum}
                                        size={getButtonSize()}
                                        variant="secondary"
                                        selected={pageNum === page}
                                        onClick={() => setPage(pageNum)}
                                    >
                                        {pageNum}
                                    </Button>
                                ));
                            })()}

                            <Button size={getButtonSize()} selected={false} onClick={() => setPage(page + 1)}
                                    disabled={page === totalFilteredPages}><Icon name="FiChevronRight"
                                                                                 size='xs'/></Button>
                            <Button size={getButtonSize()} selected={false} onClick={() => setPage(totalFilteredPages)}
                                    disabled={page === totalFilteredPages}><Icon name="FiChevronsRight"
                                                                                 size='xs'/></Button>
                        </ButtonGroup>
                    </Container>
                </Container>

            </Card>
        );

        // If theme prop is provided, wrap with ThemeProvider for inheritance
        if (theme) {
            return (
                <ThemeProvider theme={theme}>
                    {dataElement}
                </ThemeProvider>
            );
        }

        return dataElement;
    });

Data.displayName = 'Data';

export default Data;
