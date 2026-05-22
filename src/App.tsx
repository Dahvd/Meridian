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
  const { countries } = useFetchRandomizedCountries();
  const {
    gameState,
    gameType,
    difficulty,
    totalRounds,
    currentRound,
    options,
    guesses,
    streak,
    pool,
    currentCountry,
    currentTriviaQuestion,
    startGame,
    handleGuess,
    playAgain,
    goHome,
  } = useGameLogic(countries);

  return (
    <div className="app">
      {gameState === 'home' && (
        <HomeScreen onStart={startGame} />
      )}

      {gameState === 'playing' && currentCountry && (
        <>
          {gameType === 'flag' && options.length > 0 && (
            <FlagCard
              country={currentCountry}
              options={options}
              currentRound={currentRound}
              totalRounds={totalRounds}
              difficulty={difficulty}
              streak={streak}
              onGuess={handleGuess}
              onGiveUp={goHome}
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
              streak={streak}
              onGuess={handleGuess}
              onGiveUp={goHome}
            />
          )}
          {gameType === 'map' && (
            <MapGame
              country={currentCountry}
              currentRound={currentRound}
              totalRounds={totalRounds}
              difficulty={difficulty}
              onGuess={handleGuess}
              onGiveUp={goHome}
            />
          )}
          {gameType === 'flag-grid' && (
            <FlagGridGame
              country={currentCountry}
              pool={pool}
              currentRound={currentRound}
              totalRounds={totalRounds}
              onGuess={handleGuess}
              onGiveUp={goHome}
            />
          )}
          {gameType === 'higher-or-lower' && (
            <HigherOrLowerGame
              country={currentCountry}
              pool={pool}
              currentRound={currentRound}
              totalRounds={totalRounds}
              onGuess={handleGuess}
              onGiveUp={goHome}
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
              onGiveUp={goHome}
            />
          )}
          {gameType === 'odd-one-out' && (
            <OddOneOutGame
              country={currentCountry}
              pool={pool}
              currentRound={currentRound}
              totalRounds={totalRounds}
              onGuess={handleGuess}
              onGiveUp={goHome}
            />
          )}
          {gameType === 'progressive' && options.length > 0 && (
            <ProgressiveGame
              country={currentCountry}
              options={options}
              currentRound={currentRound}
              totalRounds={totalRounds}
              onGuess={handleGuess}
              onGiveUp={goHome}
            />
          )}
          {gameType === 'memory' && (
            <MemoryGame
              onFinish={() => goHome()}
              onGiveUp={goHome}
            />
          )}
        </>
      )}

      {gameState === 'results' && (
        <Results
          guesses={guesses}
          totalRounds={totalRounds}
          gameType={gameType}
          streak={streak}
          onPlayAgain={playAgain}
          onGoHome={goHome}
        />
      )}
      <FeedbackWidget />
    </div>
  );
}
