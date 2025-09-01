# 🎲 Yahtzee Clone

A modern, responsive Yahtzee game built with React, TypeScript, and Node.js. Features a beautiful UI with smooth animations, official Yahtzee rules including bonus and joker scoring, and support for both local (1-6 players) and remote multiplayer modes.

## ✨ Features

### 🎯 Core Gameplay
- **Official Yahtzee Rules**: Complete implementation of all scoring categories
- **Yahtzee Bonus**: Automatic 100-point bonus for subsequent Yahtzees
- **Joker Rules**: Complex scoring priority system for bonus Yahtzees
- **Multi-Player Support**: 1-6 players with rotating turn order
- **Dice Rolling**: Smooth animation with hold/unhold mechanics

### 🌐 Remote Multiplayer
- **Real-time Gameplay**: Synchronized game state across players
- **Invite Links**: Easy game sharing with unique URLs
- **Persistent Games**: Game state survives page refreshes
- **Session History**: Track game results and scores
- **Cross-platform**: Works on any device with a web browser

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

### Local Development
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd yahtzee-clone
   ```

2. Install dependencies:
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

3. Start the backend server:
   ```bash
   cd server
   npm run dev
   ```

4. Start the frontend development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

### Available Scripts
- `npm run dev` - Start frontend development server
- `npm run build` - Build frontend for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build
- `cd server && npm run dev` - Start backend development server

## 🚀 Deployment

### Quick Deployment
Use the provided deployment script:
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### Manual Deployment
See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions on deploying to:
- **Frontend**: Vercel, Netlify, or GitHub Pages
- **Backend**: Railway, Render, or Heroku

### Environment Variables
Copy `env.example` to `.env` and configure:
```bash
cp env.example .env
```

## 🎮 How to Play

### Local Mode
1. **Setup**: Choose number of players (1-6) and enter names
2. **Roll Dice**: Click "Roll Dice" to roll unheld dice (3 rolls per turn)
3. **Hold Dice**: Click dice to hold/unhold them between rolls
4. **Score**: Choose a scoring category after your final roll
5. **Complete Game**: Fill all 13 categories to finish

### Remote Mode
1. **Create Game**: Enter your name to create a new game
2. **Share Link**: Send the generated invite link to friends
3. **Join Game**: Friends click the link and enter their names
4. **Play**: Game starts automatically when all players join
5. **Play Again**: Start new games with the same players

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
- **Backend**: Node.js with Express
- **Database**: SQLite with better-sqlite3
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Linting**: ESLint with TypeScript support

### Project Structure
```
yahtzee-clone/
├── src/                    # Frontend (React/TypeScript)
│   ├── App.tsx            # Main game component
│   ├── game/              # Game logic and engines
│   └── types.ts           # TypeScript definitions
├── server/                # Backend (Node.js/Express)
│   ├── server.js          # Express server
│   ├── database/          # Database management
│   └── game/              # Server-side game logic
├── package.json           # Frontend dependencies
├── server/package.json    # Backend dependencies
└── DEPLOYMENT.md          # Deployment guide
```

### Key Features
- **Type Safety**: Full TypeScript implementation
- **State Management**: React hooks for game state
- **Real-time Sync**: Polling-based game state updates
- **Database Persistence**: SQLite for game state storage
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

### Remote Game Features
- **Game State Synchronization**: Real-time updates via polling
- **Turn-based Controls**: Only active player can interact
- **Error Handling**: Graceful degradation for network issues
- **Game Cleanup**: Automatic removal of old games

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

### Support
For deployment issues or questions, see [DEPLOYMENT.md](DEPLOYMENT.md) or check the project documentation.
