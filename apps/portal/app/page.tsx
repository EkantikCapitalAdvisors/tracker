import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-10">
      <h1 className="text-3xl">Ekantik Research Portal</h1>
      <ul className="mt-6 list-disc pl-6">
        <li>
          <Link className="text-gold underline" href="/dashboard/manual">
            Investor Manual — Start Here
          </Link>
        </li>
        <li className="mt-2">
          <Link className="text-gold underline" href="/dashboard/positioning">
            Market Positioning — Pre-Committed Allocation Ladder
          </Link>
        </li>
        <li className="mt-2">
          <Link className="text-gold underline" href="/dashboard/correction">
            Correction Dashboard — Real-Time Depth Intelligence
          </Link>
        </li>
      </ul>
    </main>
  );
}
