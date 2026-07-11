const FEATURES = [
  {
    title: 'Instant funnels',
    body: 'Build conversion funnels in seconds without writing SQL.',
  },
  {
    title: 'Session replays',
    body: 'Watch real sessions to see exactly where users get stuck.',
  },
  {
    title: 'Smart alerts',
    body: 'Get notified the moment a key metric moves unexpectedly.',
  },
];

export default function Features() {
  return (
    <>
    <section className="mx-auto max-w-5xl px-6 py-16 p-1.5 text-xl">
      <h2 className="text-center text-3xl font-bold bg-slate-800 pt-0.5">This is how we do.</h2>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-semibold text-indigo-300">{f.title}</h3>
            <p className="mt-2 text-sm text-slate-400">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h2 className="mb-4 font-bold p-1 text-4xl">Behold the magic</h2>
      <img
        src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop"
        alt="Unicorn"
        className="w-full rounded-lg shadow-lg"
      />
    </div>
    </>
  );
}
