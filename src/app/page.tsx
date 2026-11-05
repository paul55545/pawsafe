import PlantScanner from "@/components/PlantScanner";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-8">
      <header className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-moss-deep">PawSafe Plants</h1>
        <p className="mt-1 text-muted">Is this plant safe for my cat?</p>
      </header>
      <PlantScanner />
    </main>
  );
}
