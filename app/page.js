'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  function createGame() {
    const gameId = Math.random().toString(36).substring(2, 8);
    router.push(`/game/${gameId}?player=white`);
  }

  return (
    <div className="home">
      <h1>Chess</h1>
      <p>Play chess with a friend in real time.</p>
      <button onClick={createGame}>New Game</button>
    </div>
  );
}