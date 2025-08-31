# 🎲 Yahtzee Clone

A modern, responsive Yahtzee game built with React, TypeScript, and Vite. Features a beautiful UI with smooth animations, official Yahtzee rules including bonus and joker scoring, and support for 1-4 players.

## ✨ Features

### 🎯 Core Gameplay
- **Official Yahtzee Rules**: Complete implementation of all scoring categories
- **Yahtzee Bonus**: Automatic 100-point bonus for subsequent Yahtzees
- **Joker Rules**: Complex scoring priority system for bonus Yahtzees
- **Multi-Player Support**: 1-4 players with rotating turn order
- **Dice Rolling**: Smooth animation with hold/unhold mechanics

### 🎨 User Experience
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Visual Feedback**: Clear held dice indicators, active player highlighting
- **Smooth Animations**: Dice rolling effects and transitions
- **Intuitive Interface**: Easy-to-use controls and clear scoring display

### 🏆 Scoring Categories
- **Upper Section**: Ones, Twos, Threes, Fours, Fives, Sixes
- **Lower Section**: Three of a Kind, Four of a Kind, Full House, Small Straight, Large Straight, Yahtzee, Chance
- **Bonus Scoring**: Upper section bonus (35 points for 63+ total), Yahtzee bonus (100 points)

## 🚀 Getting Started

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd yahtzee-clone
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## 🎮 How to Play

### Basic Rules
1. **Roll Dice**: Click "Roll Dice" to roll unheld dice (3 rolls per turn)
2. **Hold Dice**: Click dice to hold/unhold them between rolls
3. **Score**: Choose a scoring category after your final roll
4. **Complete Game**: Fill all 13 categories to finish

### Yahtzee Bonus & Joker Rules
- **First Yahtzee**: Score 50 points in Yahtzee category
- **Subsequent Yahtzees**: 
  - Receive 100 bonus points
  - Must score in appropriate category based on priority:
    1. Upper section box matching dice value
    2. Three of a Kind or Four of a Kind
    3. Other lower section categories
    4. Upper section fallback (scored as zero)

## 🛠️ Technical Details

### Tech Stack
- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Linting**: ESLint with TypeScript support

### Project Structure
```
src/
├── App.tsx          # Main game component
├── App.css          # Custom styles and animations
├── types.ts         # TypeScript type definitions
├── main.tsx         # Application entry point
└── assets/          # Static assets
```

### Key Features
- **Type Safety**: Full TypeScript implementation
- **State Management**: React hooks for game state
- **Responsive Design**: Flexbox-based layout
- **Accessibility**: Semantic HTML and keyboard support

## 🎯 Game Logic

### Dice Rolling
- Uses `Math.random()` for fair dice generation
- Independent rolls for each die
- Smooth animation during rolling process

### Scoring System
- **Upper Section**: Sum of dice matching the category
- **Three/Four of a Kind**: Sum of all dice (if criteria met)
- **Full House**: 25 points (three of one, two of another)
- **Small Straight**: 30 points (four consecutive numbers)
- **Large Straight**: 40 points (five consecutive numbers)
- **Yahtzee**: 50 points (five of a kind)
- **Chance**: Sum of all dice

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🎲 Enjoy Playing!

Have fun with this modern take on the classic Yahtzee game! 🎯✨
