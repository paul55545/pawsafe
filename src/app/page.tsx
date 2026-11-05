import PlantScanner from "@/components/PlantScanner";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 p-6">
      <header className="text-center">
        <div className="text-5xl">🐱🌿</div>
        <h1 className="text-3xl font-bold">PawSafe Plants</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Is this plant safe for my cat?</p>
      </header>
      <PlantScanner />
    </main>
  );
}
