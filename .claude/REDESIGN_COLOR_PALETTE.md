# Blue Collar Bot - New Color Palette
## Extracted from Logo + Extended Range

---

## 🎨 Primary Colors

### Logo Blue (Primary)
```
Primary 600: #1565C0  (Main brand color - from logo)
Primary 700: #0D47A1  (Dark - headers, emphasis)
Primary 800: #0A2E6E  (Darker - footer, dark sections)
Primary 500: #1976D2  (Medium - buttons, links)
Primary 400: #42A5F5  (Light - highlights, hover)
Primary 300: #64B5F6  (Lighter - backgrounds, badges)
Primary 100: #E3F2FD  (Lightest - subtle backgrounds)
Primary 50:  #F5FAFF  (Near white - page backgrounds)
```

### Accent (Success/Action)
```
Success 600: #059669  (Green - success states)
Success 500: #10B981  (Medium green)
Success 100: #D1FAE5  (Light green backgrounds)
```

### Warning & Error
```
Warning 500: #F59E0B  (Amber - warnings)
Warning 100: #FEF3C7  (Light amber)

Danger 600: #DC2626   (Red - errors, cancellations)
Danger 500: #EF4444   (Medium red)
Danger 100: #FEE2E2   (Light red)
```

## 🎨 Neutral Colors

### Grey Scale
```
White:       #FFFFFF  (Pure white - cards, backgrounds)
Grey 50:     #F9FAFB  (Subtle backgrounds)
Grey 100:    #F3F4F6  (Light backgrounds, hover)
Grey 200:    #E5E7EB  (Borders, dividers)
Grey 300:    #D1D5DB  (Disabled states)
Grey 400:    #9CA3AF  (Placeholder text)
Grey 500:    #6B7280  (Secondary text, muted)
Grey 600:    #4B5563  (Body text)
Grey 700:    #374151  (Headings, strong text)
Grey 800:    #1F2937  (Dark text, near black)
Grey 900:    #111827  (Black - primary text)
```

## 🎨 Usage Guide

### Backgrounds
- **Page**: Grey 50 (#F9FAFB) or Primary 50 (#F5FAFF)
- **Cards**: White (#FFFFFF)
- **Dark Sections**: Primary 800 (#0A2E6E)

### Text
- **Headings**: Grey 900 (#111827)
- **Body**: Grey 600 (#4B5563)
- **Muted**: Grey 500 (#6B7280)
- **White on Dark**: White (#FFFFFF)

### Interactive
- **Primary Button**: Primary 600 (#1565C0)
- **Primary Hover**: Primary 700 (#0D47A1)
- **Secondary**: White with Grey 200 border
- **Danger**: Danger 600 (#DC2626)

### Status
- **Scheduled**: Grey 500
- **In Progress**: Primary 500
- **Completed**: Success 600
- **Cancelled**: Danger 600

## 🎨 Shadows & Effects

```css
/* Card Shadow */
shadow-card: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);

/* Card Hover */
shadow-card-hover: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);

/* Button Shadow */
shadow-button: 0 1px 2px rgba(21, 101, 192, 0.15);

/* Focus Ring */
focus-ring: 0 0 0 3px rgba(21, 101, 192, 0.2);
```

## 🎨 Border Radius

```
Radius SM:  4px   (Small buttons, inputs)
Radius MD:  8px   (Buttons, cards)
Radius LG:  12px  (Large cards, modals)
Radius XL:  16px  (Hero sections, feature cards)
Radius Full: 9999px (Pills, avatars)
```
