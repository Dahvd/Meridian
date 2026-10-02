import { lazy, Suspense, useState } from 'react';
import { useFetchRandomizedCountries } from './hooks/useFetchRandomizedCountries';
import { useGameLogic } from './hooks/useGameLogic';
import HomeScreen from './components/HomeScreen';
import FlagCard from './components/FlagCard';
import TriviaCard from './components/TriviaCard';
import FlagGridGame from './components/FlagGridGame';
import HigherOrLowerGame from './components/HigherOrLowerGame';
import OddOneOutGame from './components/OddOneOutGame';
import ProgressiveGame from './components/ProgressiveGame';
import Results from './components/Results';
import FeedbackWidget from './components/FeedbackWidget';

// Leaflet is a sizeable dependency — only load it for the game modes that need it.
const MapGame = lazy(() => import('./components/MapGame'));
const SilhouetteGame = lazy(() => import('./components/SilhouetteGame'));

function GameLoading() {
  return (
    <div className="status-screen">
      <div className="spinner" />
    </div>
  );
}

export default function App() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { countries } = useFetchRandomizedCountries();
  const {
    gameState,
    gameType,
    difficulty,
    totalRounds,
    currentRound,
    options,
    guesses,
    endless,
    pool,
    currentCountry,
    currentFactQuestion,
    startError,
    startGame,
    handleGuess,
    handleTriviaGuess,
    playAgain,
    goHome,
    giveUp,
  } = useGameLogic(countries);

  return (
    <div className="app">
      {gameState === 'home' && (
        <HomeScreen onStart={startGame} onFeedback={() => setFeedbackOpen(true)} startError={startError} />
      )}

      {gameState === 'playing' && currentCountry && (
        <div className="game-container">
          <button className="back-home-btn" onClick={goHome}>⌂</button>
          {gameType === 'flag' && options.length > 0 && (
            <FlagCard
              key={currentRound}
              country={currentCountry}
              options={options}
              currentRound={currentRound}
              totalRounds={totalRounds}
              difficulty={difficulty}
              endless={endless}
              onGuess={handleGuess}
              onGiveUp={giveUp}
            />
          )}
          {gameType === 'trivia' && currentFactQuestion && (
            <TriviaCard
              key={currentRound}
              question={currentFactQuestion}
              currentRound={currentRound}
              totalRounds={totalRounds}
              difficulty={difficulty}
              endless={endless}
              onGuess={handleTriviaGuess}
              onGiveUp={giveUp}
            />
          )}
          {gameType === 'map' && (
            <Suspense fallback={<GameLoading />}>
              <MapGame
                country={currentCountry}
                currentRound={currentRound}
                totalRounds={totalRounds}
                difficulty={difficulty}
                onGuess={handleGuess}
                onGiveUp={giveUp}
              />
            </Suspense>
          )}
          {gameType === 'flag-grid' && (
            <FlagGridGame
              key={currentRound}
              country={currentCountry}
              pool={pool}
              currentRound={currentRound}
              totalRounds={totalRounds}
              onGuess={handleGuess}
              onGiveUp={giveUp}
            />
          )}
          {gameType === 'higher-or-lower' && (
            <HigherOrLowerGame
              key={currentRound}
              country={currentCountry}
              pool={pool}
              currentRound={currentRound}
              totalRounds={totalRounds}
              onGuess={handleGuess}
              onGiveUp={giveUp}
            />
          )}
          {gameType === 'silhouette' && (
            <Suspense fallback={<GameLoading />}>
              <SilhouetteGame
                key={currentRound}
                country={currentCountry}
                options={options}
                currentRound={currentRound}
                totalRounds={totalRounds}
                difficulty={difficulty}
                onGuess={handleGuess}
                onGiveUp={giveUp}
              />
            </Suspense>
          )}
          {gameType === 'odd-one-out' && (
            <OddOneOutGame
              key={currentRound}
              country={currentCountry}
              pool={pool}
              currentRound={currentRound}
              totalRounds={totalRounds}
              onGuess={handleGuess}
              onGiveUp={giveUp}
            />
          )}
          {gameType === 'progressive' && options.length > 0 && (
            <ProgressiveGame
              key={currentRound}
              country={currentCountry}
              options={options}
              pool={pool}
              currentRound={currentRound}
              totalRounds={totalRounds}
              onGuess={handleGuess}
              onGiveUp={giveUp}
            />
          )}
        </div>
      )}

      {gameState === 'results' && (
        <Results
          guesses={guesses}
          totalRounds={totalRounds}
          gameType={gameType}
          endless={endless}
          onPlayAgain={playAgain}
          onGoHome={goHome}
        />
      )}
      <FeedbackWidget open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </div>
  );
}
