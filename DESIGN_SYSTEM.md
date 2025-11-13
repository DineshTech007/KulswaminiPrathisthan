# 🎨 Visual Design Guide - Notion-Inspired Theme

## Core Design Tokens

### Colors
```css
/* Primary Gray Scale (Notion) */
Gray 900: #37352f    /* Primary text, headings */
Gray 600: #787774    /* Secondary text */
Gray 400: #9b9a97    /* Tertiary text */
Gray 200: #e3e2e0    /* Borders, dividers */
Gray 100: #f7f6f3    /* Subtle backgrounds */
White:    #ffffff    /* Main background */

/* Accent Colors (subtle use only) */
Blue:   #0b6e99
Green:  #4d6461
Orange: #d9730d
```

### Typography
```css
Font Family: Inter, -apple-system, system-ui
Body: 14px / 400 weight
Heading: 16-24px / 600 weight
Small: 12px / 400 weight
```

### Spacing Scale
```css
xs: 2px
sm: 4px
md: 8px
lg: 12px
xl: 16px
2xl: 24px
```

### Border Radius
```css
Default: 3px (Notion-style)
```

### Shadows
```css
/* Notion shadow - subtle depth */
shadow-notion: 0 1px 1px rgba(0,0,0,0.03), 0 3px 6px rgba(0,0,0,0.02)

/* Hover shadow - slightly more prominent */
shadow-notion-hover: 0 2px 4px rgba(0,0,0,0.08), 0 8px 16px rgba(0,0,0,0.06)
```

## Component Patterns

### Button Styles

**Primary Button**
```jsx
className="rounded-notion bg-gray-900 px-4 py-2 text-sm font-medium text-white 
           hover:bg-gray-800 transition-all duration-150"
```

**Secondary Button**
```jsx
className="rounded-notion border bg-white px-4 py-2 text-sm font-medium 
           text-gray-700 hover:bg-gray-50 transition-all duration-150"
style={{ borderColor: 'rgba(55, 53, 47, 0.16)' }}
```

### Card Styles

**Content Card**
```jsx
className="rounded-notion border bg-white p-6 shadow-notion"
style={{ borderColor: 'rgba(55, 53, 47, 0.09)' }}
```

**Hover Card**
```jsx
className="rounded-notion border bg-white p-4 transition-all duration-150 
           hover:shadow-notion-hover"
style={{ borderColor: 'rgba(55, 53, 47, 0.09)' }}
```

### Input Fields

**Text Input**
```jsx
className="w-full rounded-notion border bg-white px-3 py-2 text-sm 
           focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
style={{ borderColor: 'rgba(55, 53, 47, 0.09)' }}
```

### Navigation

**Nav Link**
```jsx
className="px-3 py-1.5 text-sm font-medium rounded-notion 
           text-gray-600 hover:bg-gray-50 hover:text-gray-900
           [active]: bg-gray-100 text-gray-900"
```

### Headers

**Page Header**
```jsx
<div>
  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
    Section Label
  </p>
  <h1 className="mt-2 text-3xl font-semibold text-gray-900">
    Page Title
  </h1>
</div>
```

**Section Header**
```jsx
<h2 className="text-xl font-semibold text-gray-900">
  Section Title
</h2>
<p className="mt-1 text-sm text-gray-600">
  Subtitle or description
</p>
```

## Layout Patterns

### Page Container
```jsx
<div className="mx-auto max-w-7xl px-6 py-12 lg:px-12">
  {/* Content */}
</div>
```

### Two-Column Layout
```jsx
<div className="grid gap-8 lg:grid-cols-[1fr_auto]">
  <div>{/* Main content */}</div>
  <div>{/* Sidebar */}</div>
</div>
```

### Grid of Cards
```jsx
<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
  {items.map(item => (
    <div className="rounded-notion border bg-white p-4" 
         style={{ borderColor: 'rgba(55, 53, 47, 0.09)' }}>
      {/* Card content */}
    </div>
  ))}
</div>
```

## Animation Guidelines

**Page Entry**
```jsx
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.4, ease: 'easeOut' }}
```

**Card Hover**
```jsx
className="transition-all duration-150 hover:shadow-notion-hover"
```

**Button Interaction**
```jsx
className="transition-all duration-150 hover:bg-gray-800"
```

## Mobile Responsiveness

### Breakpoints
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

### Mobile-First Patterns
```jsx
// Stack on mobile, row on desktop
className="flex flex-col gap-4 lg:flex-row"

// Single column on mobile, grid on desktop
className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"

// Hide on mobile, show on desktop
className="hidden lg:block"
```

## Accessibility

### Color Contrast
- Text on white: `#37352f` ✅ WCAG AAA
- Gray text: `#787774` ✅ WCAG AA
- Links: Underline on hover

### Focus States
```jsx
focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2
```

### Semantic HTML
- Use `<nav>`, `<main>`, `<section>`, `<article>`
- Proper heading hierarchy (h1 → h2 → h3)
- `aria-label` for icon buttons

## Performance

### Image Optimization
```jsx
loading="lazy"
width={size}
height={size}
```

### Animation Performance
- Use `transform` and `opacity` only
- Keep duration under 400ms
- Use `ease-out` for entrance
- Use `ease-in` for exit

## Do's and Don'ts

### ✅ Do
- Use subtle shadows
- Keep borders light
- Use neutral grays
- Maintain consistent spacing
- Add smooth transitions
- Keep text readable
- Use system fonts

### ❌ Don't
- Use bright gradients
- Add complex shadows
- Mix multiple colors
- Use large border-radius
- Add heavy animations
- Use decorative fonts
- Add unnecessary visual elements

## Example Component

```jsx
// Clean Notion-style card component
export const NotionCard = ({ title, description, children }) => {
  return (
    <article 
      className="rounded-notion border bg-white p-6 shadow-notion 
                 transition-all duration-150 hover:shadow-notion-hover"
      style={{ borderColor: 'rgba(55, 53, 47, 0.09)' }}
    >
      <h3 className="text-base font-semibold text-gray-900">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-sm text-gray-600">
          {description}
        </p>
      )}
      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </article>
  );
};
```

---

This design system ensures a **consistent, professional, and clean** appearance throughout the application! 🎨✨
