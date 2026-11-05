import PlantScanner from "@/components/PlantScanner";
import Title from "@/components/Title";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-8">
      <Title />
      <PlantScanner />
    </main>
  );
}
