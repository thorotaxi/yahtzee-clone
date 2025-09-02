# Changelog

All notable changes to this project will be documented in this file.

## [1.0.2] - 2024-12-19

### 🎨 Enhanced Mobile Responsiveness
- **Reduced Button Padding**: Cut button padding in half across all screens for better mobile experience
- **Responsive Name Fields**: Player name input fields now scale down on narrow screens using `clamp()` function
- **Flexible Button Layouts**: Added `flexWrap: 'wrap'` to button groups for better mobile arrangement

### 📱 Improved Layout & Spacing
- **Eliminated White Margins**: Removed all "big white margins" so green background extends to screen edges
- **Tightened Spacing**: Reduced margins and padding throughout the UI to minimize dead space
- **Consistent Header Sizing**: Made Yahtzee logo and section headers responsive using `clamp()` function
- **Optimized Container Layouts**: Reduced padding on main containers to maximize usable space

### 🔧 Technical Improvements
- **Minimum Width Protection**: Set minimum container width to 480px to prevent layout rearrangement on very narrow screens
- **Responsive Typography**: Implemented dynamic font sizing using CSS `clamp()` function for better scaling
- **Code Quality**: Resolved all ESLint errors and warnings in the main App.tsx component
- **Performance**: Added `useCallback` optimization for remote game history fetching

### 🎯 UI Text Updates
- **Button Text**: Changed "Challenge Your Friend" to "Challenge a Friend" for better clarity

### 📦 Dependencies
- **Updated**: Backend `better-sqlite3` from v9.2.2 to v12.2.0 for better compatibility

## [1.0.1] - Previous Version

### 🎲 Core Features
- Complete Yahtzee game implementation with official rules
- Local multiplayer support (1-6 players)
- Remote multiplayer with real-time synchronization
- Responsive design for desktop and mobile devices

### 🌐 Remote Multiplayer Features
- Real-time game state synchronization
- Invite link sharing system
- Persistent game sessions
- Game history tracking

### 🎨 User Experience
- Smooth dice rolling animations
- Visual feedback for held dice
- Active player highlighting
- Intuitive scoring interface
