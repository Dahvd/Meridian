import { useState } from 'react';
import { useFetchRandomizedCountries } from './hooks/useFetchRandomizedCountries';
import { useGameLogic } from './hooks/useGameLogic';
import HomeScreen from './components/HomeScreen';
import FlagCard from './components/FlagCard';
import TriviaCard from './components/TriviaCard';
import MapGame from './components/MapGame';
import FlagGridGame from './components/FlagGridGame';
import HigherOrLowerGame from './components/HigherOrLowerGame';
import SilhouetteGame from './components/SilhouetteGame';
import OddOneOutGame from './components/OddOneOutGame';
import ProgressiveGame from './components/ProgressiveGame';
import MemoryGame from './components/MemoryGame';
import Results from './components/Results';
import FeedbackWidget from './components/FeedbackWidget';

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
    currentTriviaQuestion,
    startGame,
    handleGuess,
    playAgain,
    goHome,
    giveUp,
  } = useGameLogic(countries);

  return (
    <div className="app">
      {gameState === 'home' && (
        <HomeScreen onStart={startGame} onFeedback={() => setFeedbackOpen(true)} />
      )}

      {gameState === 'playing' && currentCountry && (
        <div className="game-container">
          <button className="back-home-btn" onClick={goHome}>⌂</button>
          {gameType === 'flag' && options.length > 0 && (
            <FlagCard
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
          {gameType === 'trivia' && currentTriviaQuestion && options.length > 0 && (
            <TriviaCard
              country={currentCountry}
              question={currentTriviaQuestion}
              options={options}
              currentRound={currentRound}
              totalRounds={totalRounds}
              difficulty={difficulty}
              endless={endless}
              onGuess={handleGuess}
              onGiveUp={giveUp}
            />
          )}
          {gameType === 'map' && (
            <MapGame
              country={currentCountry}
              currentRound={currentRound}
              totalRounds={totalRounds}
              difficulty={difficulty}
              onGuess={handleGuess}
              onGiveUp={giveUp}
            />
          )}
          {gameType === 'flag-grid' && (
            <FlagGridGame
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
              country={currentCountry}
              pool={pool}
              currentRound={currentRound}
              totalRounds={totalRounds}
              onGuess={handleGuess}
              onGiveUp={giveUp}
            />
          )}
          {gameType === 'silhouette' && (
            <SilhouetteGame
              country={currentCountry}
              options={options}
              currentRound={currentRound}
              totalRounds={totalRounds}
              difficulty={difficulty}
              onGuess={handleGuess}
              onGiveUp={giveUp}
            />
          )}
          {gameType === 'odd-one-out' && (
            <OddOneOutGame
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
              country={currentCountry}
              options={options}
              pool={pool}
              currentRound={currentRound}
              totalRounds={totalRounds}
              onGuess={handleGuess}
              onGiveUp={giveUp}
            />
          )}
          {gameType === 'memory' && (
            <MemoryGame
              onFinish={() => goHome()}
              onGiveUp={() => giveUp()}
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
