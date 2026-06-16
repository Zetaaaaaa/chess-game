import Pusher from 'pusher';

// Initialize the server-side Pusher client with credentials from environment variables
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  useTLS: true,
});

// POST handler that broadcasts a move to the game's Pusher channel
export async function POST(request) {
  const { gameId, move, player } = await request.json();
  await pusher.trigger(`game-${gameId}`, 'move-made', { move, player });
  return Response.json({ success: true });
}