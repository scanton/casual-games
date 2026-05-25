import ArcadeApp from '@/arcade/components/ArcadeApp'

// Dev harness: simulates the user object the parent app would provide
const MOCK_USER = {
  id: 'dev-user-1',
  email: 'dev@heartstamp.com',
  displayName: 'DevPlayer',
}

export default function Home() {
  return (
    // Simulates the parent app's background (editor canvas)
    <div className="min-h-screen bg-[#e5e5e5] flex items-center justify-center p-8">
      {/* Simulates the modal container dimensions the arcade will live in */}
      <div
        className="rounded-2xl overflow-hidden shadow-2xl border border-gray-300"
        style={{ width: 680, height: 600 }}
      >
        <ArcadeApp user={MOCK_USER} />
      </div>
    </div>
  )
}
