'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Chess } from 'chess.js';
import Pusher from 'pusher-js';

const PIECE_SYMBOLS = {
  wk: '\u2654', wq: '\u2655', wr: '\u2656', wb: '\u2657', wn: '\u2658', wp: '\u2659',
  bk: '\u265A', bq: '\u265B', br: '\u265C', bb: '\u265D', bn: '\u265E', bp: '\u265F',
};

// Clones a Chess instance preserving full move history via PGN
function cloneGame(source) {
  const clone = new Chess();
  clone.loadPgn(source.pgn());
  return clone;
}

export default function GamePage() {
  const params = useParams();
  const gameId = params.id;
  const searchParams = useSearchParams();
  const playerColor = searchParams.get('player') === 'white' ? 'w' : 'b';

  const [game, setGame] = useState(new Chess());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [status, setStatus] = useState('');
  const historyEndRef = useRef(null);

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });

    const channel = pusher.subscribe(`game-${gameId}`);

    channel.bind('move-made', (data) => {
      if (data.player === playerColor) return;
      setGame((prevGame) => {
        // Use cloneGame instead of new Chess(prevGame.fen()) to preserve history
        const updatedGame = cloneGame(prevGame);
        try {
          updatedGame.move(data.move);
        } catch (e) {
          return prevGame;
        }
        return updatedGame;
      });
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`game-${gameId}`);
      pusher.disconnect();
    };
  }, [gameId, playerColor]);

  useEffect(() => {
    if (game.isCheckmate()) {
      setStatus(`Checkmate! ${game.turn() === 'w' ? 'Black' : 'White'} wins!`);
    } else if (game.isDraw()) {
      setStatus('Draw!');
    } else if (game.inCheck()) {
      setStatus('Check!');
    } else {
      setStatus(game.turn() === 'w' ? "White's turn" : "Black's turn");
    }
  }, [game]);

  useEffect(() => {
    if (historyEndRef.current) {
      historyEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [game]);

  function getBoard() {
    const board = game.board();
    if (playerColor === 'b') {
      return board.map((row) => [...row].reverse()).reverse();
    }
    return board;
  }

  function getSquareName(rowIndex, colIndex) {
    if (playerColor === 'b') {
      const file = String.fromCharCode(104 - colIndex);
      const rank = rowIndex + 1;
      return `${file}${rank}`;
    }
    const file = String.fromCharCode(97 + colIndex);
    const rank = 8 - rowIndex;
    return `${file}${rank}`;
  }

  function handleSquareClick(rowIndex, colIndex) {
    const square = getSquareName(rowIndex, colIndex);
    if (game.turn() !== playerColor) return;

    if (selectedSquare) {
      const moveAttempt = { from: selectedSquare, to: square, promotion: 'q' };
      // Use cloneGame instead of new Chess(game.fen()) to preserve history
      const gameCopy = cloneGame(game);

      try {
        gameCopy.move(moveAttempt);
        setGame(gameCopy);
        setSelectedSquare(null);
        setLegalMoves([]);
        fetch('/api/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId, move: moveAttempt, player: playerColor }),
        });
      } catch (e) {
        const piece = game.get(square);
        if (piece && piece.color === playerColor) {
          setSelectedSquare(square);
          const moves = game.moves({ square, verbose: true });
          setLegalMoves(moves.map((m) => m.to));
        } else {
          setSelectedSquare(null);
          setLegalMoves([]);
        }
      }
    } else {
      const piece = game.get(square);
      if (piece && piece.color === playerColor) {
        setSelectedSquare(square);
        const moves = game.moves({ square, verbose: true });
        setLegalMoves(moves.map((m) => m.to));
      }
    }
  }

  function getSquareClass(rowIndex, colIndex) {
    const isLight = (rowIndex + colIndex) % 2 === 0;
    const square = getSquareName(rowIndex, colIndex);
    let className = `square ${isLight ? 'light' : 'dark'}`;
    if (square === selectedSquare) className += ' selected';
    if (legalMoves.includes(square)) className += ' legal-move';
    return className;
  }

  function getMoveHistory() {
    const moves = game.history();
    const pairs = [];
    for (let i = 0; i < moves.length; i += 2) {
      pairs.push({
        number: Math.floor(i / 2) + 1,
        white: moves[i],
        black: moves[i + 1] || '',
      });
    }
    return pairs;
  }

  const shareLink = typeof window !== 'undefined'
    ? `${window.location.origin}/game/${gameId}?player=black`
    : '';

  return (
    <div className="game-container">
      <h1>Chess Game</h1>
      <p className="status">{status}</p>
      <p className="player-info">
        You are playing as: {playerColor === 'w' ? 'White' : 'Black'}
      </p>

      <div className="game-layout">
        <div className="board">
          {getBoard().map((row, rowIndex) =>
            row.map((piece, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={getSquareClass(rowIndex, colIndex)}
                onClick={() => handleSquareClick(rowIndex, colIndex)}
              >
                {piece && (
                  <span className={`piece ${piece.color}`}>
                    {PIECE_SYMBOLS[`${piece.color}${piece.type}`]}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        <div className="history-panel">
          <h3>Moves</h3>
          <div className="history-list">
            {getMoveHistory().map((pair) => (
              <div key={pair.number} className="history-row">
                <span className="move-number">{pair.number}.</span>
                <span className="move-white">{pair.white}</span>
                <span className="move-black">{pair.black}</span>
              </div>
            ))}
            <div ref={historyEndRef} />
          </div>
        </div>
      </div>

      {playerColor === 'w' && (
        <div className="share-section">
          <p>Share this link with your opponent:</p>
          <input
            type="text"
            readOnly
            value={shareLink}
            onClick={(e) => e.target.select()}
          />
        </div>
      )}
    </div>
  );
}